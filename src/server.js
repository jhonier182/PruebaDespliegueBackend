require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const { sessionConfig, sessionLogger } = require('./config/session');
const { setupAdminAccount } = require('./services/setupService');
require('./config/passport');
const routes = require('./routes');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const socketService = require('./services/socketService');
const QRModel = require('./models/QRModel');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);

// Configuración de CORS dinámica basada en el entorno
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            process.env.API_URL,
            // Permitir localhost en desarrollo
            'http://localhost:5175',
            'http://localhost:3000'
        ].filter(Boolean); // Elimina valores undefined/null

        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400
};

// Configuración de Socket.io
const io = socketIo(server, {
    cors: corsOptions
});

const PORT = process.env.PORT || 5000;

// Middlewares esenciales
app.use(express.json());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors(corsOptions));

// Configuración de sesión y autenticación
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());

// Middleware de logging solo en desarrollo
if (process.env.NODE_ENV === 'development') {
    app.use(sessionLogger);
}

// Rutas API
app.use('/api', routes);

// Configuración de Socket.io
socketService.initialize(io);

// Conexión a MongoDB con reintentos
const connectWithRetry = async () => {
    // Verificar si la URI de MongoDB está definida
    if (!process.env.MONGODB_URI) {
        console.error('❌ Error: Variable de entorno MONGODB_URI no está definida');
        console.warn('⚠️ La aplicación funcionará con funcionalidad limitada.');
        return false;
    }
    
    const maxRetries = 5;
    let currentTry = 1;

    while (currentTry <= maxRetries) {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                ssl: true,
                tls: true,
                tlsAllowInvalidCertificates: process.env.NODE_ENV === 'development',
                retryWrites: true,
                w: 'majority',
                minPoolSize: 0,
                maxPoolSize: 10,
                connectTimeoutMS: 10000,
                family: 4,
                authSource: 'admin',
                directConnection: false
            });
            console.log('✅ Conectado a MongoDB exitosamente');
            return true;
        } catch (err) {
            console.error(`❌ Intento ${currentTry} de ${maxRetries} fallido:`, err.message);
            if (currentTry === maxRetries) {
                console.error('❌ No se pudo conectar a MongoDB después de múltiples intentos');
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, 5000)); // Espera 5 segundos antes de reintentar
            currentTry++;
        }
    }
    return false;
};

// Ruta de estado del servidor
app.get('/', (_, res) => {
    res.json({
        status: 'ok',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/api/health', (_, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
    });
});

// Inicialización del servidor
const startServer = async () => {
    try {
        const dbConnected = await connectWithRetry();
        
        if (dbConnected) {
            try {
                await setupAdminAccount();
            } catch (error) {
                console.error('❌ Error al configurar cuenta de administrador:', error.message);
            }
        }
        
        server.listen(PORT, () => {
            console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
            console.log(`✅ Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`✅ URL Frontend: ${process.env.FRONTEND_URL || 'no configurado'}`);
            if (!dbConnected) {
                console.warn('⚠️ Servidor funcionando sin conexión a MongoDB - funcionalidad limitada');
            }
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

// Manejo de señales de terminación
process.on('SIGTERM', () => {
    console.log('Recibida señal SIGTERM. Cerrando servidor...');
    server.close(() => {
        console.log('Servidor cerrado.');
        mongoose.connection.close(false, () => {
            console.log('Conexión MongoDB cerrada.');
            process.exit(0);
        });
    });
});

startServer();
