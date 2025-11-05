const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
require('dotenv').config();

const createIndexes = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Create indexes for Booking collection
        console.log('Creating indexes for Booking collection...');
        
        await Booking.createIndexes();
        
        console.log('✅ All indexes created successfully!');
        
        // List all indexes
        const indexes = await Booking.collection.getIndexes();
        console.log('\n📋 Current Booking indexes:');
        console.log(JSON.stringify(indexes, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating indexes:', error);
        process.exit(1);
    }
};

createIndexes();