const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShopJoinRequestSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    status: { type: String, enum: ['linked', 'unlinked', 'requested'], default: 'requested' },
    requestedAt: { type: Date, default: Date.now },
    reviewedBy: { type: Schema.Types.ObjectId, required: false },
    reviewedAt: { type: Date },
    message: { type: String },
    role: { type: String, required: true }
});

module.exports = mongoose.model('ShopJoinRequest', ShopJoinRequestSchema);
