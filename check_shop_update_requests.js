// Quick script to check ShopUpdateRequest collection
// Run this with: node check_shop_update_requests.js

const mongoose = require('mongoose');
require('dotenv').config();

const ShopUpdateRequestSchema = new mongoose.Schema({
    uid: String,
    shopOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
    requestedChanges: { type: Map, of: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: String,
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
}, { timestamps: true });

const ShopUpdateRequest = mongoose.model('ShopUpdateRequest', ShopUpdateRequestSchema);

async function checkRequests() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all update requests
        const requests = await ShopUpdateRequest.find()
            .populate('shopId', 'name')
            .populate('shopOwnerId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(10);

        console.log(`\nFound ${requests.length} update requests:`);
        
        requests.forEach((request, index) => {
            console.log(`\n${index + 1}. Request ID: ${request._id}`);
            console.log(`   UID: ${request.uid}`);
            console.log(`   Status: ${request.status}`);
            console.log(`   Priority: ${request.priority}`);
            console.log(`   Shop: ${request.shopId?.name || 'Unknown'}`);
            console.log(`   Owner: ${request.shopOwnerId?.firstName} ${request.shopOwnerId?.lastName}`);
            console.log(`   Created: ${request.createdAt}`);
            console.log(`   Changes: ${Object.keys(request.requestedChanges || {}).length} fields`);
            
            if (request.requestedChanges) {
                console.log('   Fields changed:');
                for (const [field, change] of request.requestedChanges) {
                    console.log(`     - ${field}: "${change.oldValue}" → "${change.newValue}"`);
                }
            }
        });

        // Get count by status
        const statusCounts = await ShopUpdateRequest.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        console.log('\nStatus Summary:');
        statusCounts.forEach(stat => {
            console.log(`   ${stat._id}: ${stat.count}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkRequests();