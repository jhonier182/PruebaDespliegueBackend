const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true
    },
    expires: {
        type: Date,
        required: true
    },
    isRevoked: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const RefreshTokenModel = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshTokenModel; 