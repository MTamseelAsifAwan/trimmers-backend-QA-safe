// src/models/Role.js
const mongoose = require('mongoose');
const { generateModelId, MODEL_PREFIXES } = require('../utils/idGenerator');

const RoleSchema = new mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        default: () => generateModelId(MODEL_PREFIXES.ROLE),
        index: true
    },
    name: {
        type: String,
        required: [true, 'Role name is required'],
        unique: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    permissions: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

// Virtual for users with this role
RoleSchema.virtual('users', {
    ref: 'User',
    localField: '_id',
    foreignField: 'roleId',
    justOne: false
});

module.exports = mongoose.model('Role', RoleSchema);