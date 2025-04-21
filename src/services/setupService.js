const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const setupAdminAccount = async () => {
    // Verificar si Mongoose está conectado
    if (mongoose.connection.readyState !== 1) {
        console.warn('⚠️ No se puede configurar la cuenta de administrador: MongoDB no está conectado');
        return;
    }

    try {
        // Verificar si existe algún usuario admin
        const adminExists = await UserModel.findOne({ role: 'admin' });

        if (!adminExists) {
            console.log('Creando cuenta por defecto...');

            // Crear contraseña segura y hashearla
            const password = 'petConnect12345';
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            try {
                // Crear usuario admin directamente sin usar el modelo
                await UserModel.create({
                    name: 'ADMIN',
                    email: 'admin@gmail.com',
                    password: hashedPassword,
                    role: 'admin',
                    is_profile_public: false
                });
                // Verificar que se guardó correctamente
                const savedAdmin = await UserModel.findOne({ 
                    email: 'admin@gmail.com' 
                }).select('+password');

                if (savedAdmin && savedAdmin.password) {
                    console.log('✅ Cuenta de administrador creada exitosamente');
                    console.log('📧 Email:', savedAdmin.email);
                    console.log('🔑 Contraseña:', password);
                } else {
                    throw new Error('La contraseña no se guardó correctamente');
                }
            } catch (error) {
                console.error('Error al crear admin:', error);
                throw error;
            }
        } else {
            console.log('✅ Cuenta de administrador ya existe');
        }
    } catch (error) {
        console.error('❌ Error al configurar cuenta de administrador:', error);
        // No relanzamos el error para permitir que el servidor siga iniciando
    }
};

module.exports = {
    setupAdminAccount
}; 