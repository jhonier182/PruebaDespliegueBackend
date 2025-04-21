const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const petRoutes = require('./petRoutes');
const qrRoutes = require('./qrRoutes');
const orderRoutes = require('./orderRoutes');
const chatRoutes = require('./chatRoutes');
const adminRoutes = require('./adminRoutes');
const paymentRoutes = require('./paymentRoutes');
const AdminData = require('../data/adminData');

// Middleware para verificar si MongoDB está disponible
const checkMongoDBConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            error: 'Base de datos no disponible',
            message: 'El servicio de MongoDB no está disponible actualmente. Algunas funcionalidades están limitadas.'
        });
    }
    next();
};

// Rutas que requieren base de datos
router.use('/auth', checkMongoDBConnection, authRoutes);
router.use('/users', checkMongoDBConnection, userRoutes);
router.use('/pets', checkMongoDBConnection, petRoutes);
router.use('/qr', checkMongoDBConnection, qrRoutes);
router.use('/orders', checkMongoDBConnection, orderRoutes);
router.use('/chat', checkMongoDBConnection, chatRoutes);
router.use('/admin', checkMongoDBConnection, adminRoutes);
router.use('/payments', checkMongoDBConnection, paymentRoutes);

// Ruta de estado/health check
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

module.exports = router; 