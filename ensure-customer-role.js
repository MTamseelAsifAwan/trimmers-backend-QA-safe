const mongoose = require('mongoose');
const Role = require('./src/models/Role');

async function ensureCustomerRole() {
    try {
        // Use the same connection string as the application
        const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://usmanliaqat61:mOnoTQwQctoPUaSf@rmgdb.fm5aagk.mongodb.net/barber-app-live?retryWrites=true&w=majority';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Check if customer role exists
        const customerRole = await Role.findOne({ name: { $regex: new RegExp('^\\s*customer\\s*$', 'i') } });

        if (customerRole) {
            console.log('✅ Customer role already exists:', customerRole._id);
            console.log('Role details:', {
                name: customerRole.name,
                permissions: customerRole.permissions
            });
        } else {
            console.log('❌ Customer role not found, creating...');
            const newRole = await Role.create({
                name: 'customer',
                description: 'Customer role with basic permissions',
                permissions: [
                    'view_own_profile',
                    'update_own_profile',
                    'create_booking',
                    'view_own_bookings',
                    'update_own_booking',
                    'cancel_booking',
                    'view_own_payments',
                    'make_payment'
                ]
            });
            console.log('✅ Created customer role:', newRole._id);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

ensureCustomerRole();
