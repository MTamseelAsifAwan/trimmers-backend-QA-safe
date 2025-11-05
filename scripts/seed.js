const mongoose = require('mongoose');
const Role = require('../src/models/Role');

mongoose.connect('mongodb://localhost:27017/barber-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function seedRolesOnly() {
  try {
    console.log('Seeding roles with proper permissions...');

    // Update or create shop_owner role with create_shop permission
    const shopOwnerRole = await Role.findOneAndUpdate(
      { name: 'shop_owner' },
      {
        name: 'shop_owner',
        description: 'Shop owner with shop management permissions',
        permissions: [
          'view_shops', 'create_shop', 'update_shop', 'delete_shop',
          'view_shop_details', 'manage_shop_services', 'manage_shop_barbers',
          'view_barbers', 'create_barber', 'update_barber', 'delete_barber',
          'view_services', 'create_service', 'update_service', 'delete_service',
          'view_bookings', 'update_booking', 'manage_booking_status',
          'view_payments', 'process_payment', 'view_payment_details'
        ]
      },
      { upsert: true, new: true }
    );

    console.log('Shop owner role updated:', shopOwnerRole.permissions);

    // Create or update barber role with booking management permissions
    const barberRole = await Role.findOneAndUpdate(
      { name: 'barber' },
      {
        name: 'barber',
        description: 'Barber with booking management permissions',
        permissions: [
          'view_bookings', 'manage_bookings', 'update_booking_status',
          'view_services', 'view_profile', 'update_profile',
          'view_schedule', 'update_schedule'
        ]
      },
      { upsert: true, new: true }
    );

    console.log('Barber role updated:', barberRole.permissions);

    // Create or update freelancer role with booking management permissions
    const freelancerRole = await Role.findOneAndUpdate(
      { name: 'freelancer' },
      {
        name: 'freelancer',
        description: 'Freelancer with booking management permissions',
        permissions: [
          'view_bookings', 'manage_bookings', 'update_booking_status',
          'view_services', 'view_profile', 'update_profile',
          'view_schedule', 'update_schedule'
        ]
      },
      { upsert: true, new: true }
    );

    console.log('Freelancer role updated:', freelancerRole.permissions);

    // Create or update customer role
    const customerRole = await Role.findOneAndUpdate(
      { name: 'customer' },
      {
        name: 'customer',
        description: 'Customer with basic booking permissions',
        permissions: [
          'view_own_bookings', 'create_booking', 'update_own_booking',
          'cancel_own_booking', 'view_services', 'view_profile', 'update_profile'
        ]
      },
      { upsert: true, new: true }
    );

    console.log('Customer role updated:', customerRole.permissions);

    // Ensure admin role has all permissions
    const adminRole = await Role.findOneAndUpdate(
      { name: 'admin' },
      {
        name: 'admin',
        description: 'Administrator with full access',
        permissions: ['*'] // Admin has all permissions
      },
      { upsert: true, new: true }
    );

    console.log('Admin role updated:', adminRole.permissions);

    console.log('All roles seeded successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding roles:', error);
    mongoose.connection.close();
  }
}

seedRolesOnly();
