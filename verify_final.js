const mongoose = require('mongoose');
const ShopUpdateRequest = require('./src/models/ShopUpdateRequest');
// Require models to register them
require('./src/models/User');
require('./src/models/Shop');

async function verifyFinalState() {
    try {
        // Connect to database
        await mongoose.connect('mongodb+srv://usmanliaqat61:mOnoTQwQctoPUaSf@rmgdb.fm5aagk.mongodb.net/barber-app-live?retryWrites=true&w=majority');

        console.log('Final verification:');

        // Get all pending shop update requests (simulating the API)
        const requests = await ShopUpdateRequest.find({ status: 'pending' })
            .populate({
                path: 'shopOwnerId',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'shopId',
                select: 'name address city uid'
            })
            .sort({ requestedAt: -1 })
            .lean();

        console.log(`Found ${requests.length} pending shop update requests:`);

        requests.forEach((request, index) => {
            console.log(`\n--- Request ${index + 1} ---`);
            console.log(`Shop: ${request.shopId?.name || 'Unknown Shop'}`);
            console.log(`Owner: ${request.shopOwnerId?.firstName || 'Unknown'} ${request.shopOwnerId?.lastName || 'Owner'}`);
            console.log(`Status: ${request.status}`);
            console.log(`Requested At: ${request.requestedAt}`);
        });

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verifyFinalState();