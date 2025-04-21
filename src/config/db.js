const mongoose = require('mongoose');

const connectDB = async () => {
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
        console.log('✅ Conectado a MongoDB 🚀....');
    } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error.message);
        process.exit(1); // Salir de la app si hay un error
    }
};

module.exports = { connectDB };
