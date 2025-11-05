// Update barber location script
require('dotenv').config();
const mongoose = require('mongoose');
const Barber = require('./src/models/Barber');

async function updateBarberLocation() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        const barberId = '68c3ccc8fcd2ba2fd7d2b84f';

        // Update barber with location
        const result = await Barber.findByIdAndUpdate(
            barberId,
            {
                $set: {
                    'profile.location': {
                        latitude: 33,
                        longitude: 73
                    }
                }
            },
            { new: true }
        );

        if (result) {
            console.log('✅ Barber location updated successfully!');
            console.log('📍 New location:', result.profile.location);
            console.log('👤 Barber:', result.firstName, result.lastName);
            console.log('🆔 ID:', result._id);
        } else {
            console.log('❌ Barber not found');
        }

    } catch (error) {
        console.error('❌ Error updating barber location:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

// Run the update
updateBarberLocation();
