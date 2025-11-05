// Seed roles script
require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('./src/models/Role');

const roles = [
    {
        name: 'super_admin',
        permissions: ['*'],
        description: 'Super Administrator with all permissions'
    },
    {
        name: 'admin', 
        permissions: ['*'],
        description: 'Administrator with all permissions'
    },
    {
        name: 'country_manager',
        permissions: ['manage_country', 'verify_shop_owner', 'manage_shops'],
        description: 'Country Manager'
    },
    {
        name: 'customer_care',
        permissions: ['view_customers', 'manage_bookings'],
        description: 'Customer Care'
    },
    {
        name: 'shop_owner',
        permissions: ['create_shop', 'manage_own_shops', 'manage_bookings'],
        description: 'Shop Owner'
    },
    {
        name: 'barber',
        permissions: ['manage_own_bookings', 'view_shop_bookings'],
        description: 'Barber'
    },
    {
        name: 'freelancer', 
        permissions: ['manage_own_bookings'],
        description: 'Freelancer'
    },
    {
        name: 'customer',
        permissions: ['create_booking', 'manage_own_bookings'],
        description: 'Customer'
    }
];

async function seedRoles() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        for (const roleData of roles) {
            const existingRole = await Role.findOne({ name: roleData.name });
            
            if (!existingRole) {
                const role = new Role(roleData);
                await role.save();
                console.log(`✅ Created role: ${roleData.name}`);
            } else {
                console.log(`⚠️  Role already exists: ${roleData.name}`);
            }
        }
        
        console.log('✅ Role seeding completed');
    } catch (error) {
        console.error('❌ Error seeding roles:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

seedRoles();