const mongoose = require('mongoose');
const Role = require('./src/models/Role');

async function checkAndUpdateRoles() {
  try {
    // Connect to MongoDB using the same connection as the app
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://usmanliaqat61:mOnoTQwQctoPUaSf@rmgdb.fm5aagk.mongodb.net/barber-app-live?retryWrites=true&w=majority');

    console.log('Checking existing roles...');

    // Get all roles
    const roles = await Role.find({});
    console.log('Found roles:', roles.map(r => ({ name: r.name, permissions: r.permissions })));

    // Update barber role with manage_bookings permission
    const barberRole = await Role.findOneAndUpdate(
      { name: 'barber' },
      {
        $addToSet: { permissions: 'manage_bookings' }
      },
      { new: true }
    );

    if (barberRole) {
      console.log('Updated barber role permissions:', barberRole.permissions);
    } else {
      console.log('Barber role not found, creating it...');
      const newBarberRole = await Role.create({
        name: 'barber',
        description: 'Barber with booking management permissions',
        permissions: [
          'view_bookings', 'manage_bookings', 'update_booking_status',
          'view_services', 'view_profile', 'update_profile',
          'view_schedule', 'update_schedule'
        ]
      });
      console.log('Created barber role:', newBarberRole.permissions);
    }

    // Update freelancer role with manage_bookings permission
    const freelancerRole = await Role.findOneAndUpdate(
      { name: 'freelancer' },
      {
        $addToSet: { permissions: 'manage_bookings' }
      },
      { new: true }
    );

    if (freelancerRole) {
      console.log('Updated freelancer role permissions:', freelancerRole.permissions);
    } else {
      console.log('Freelancer role not found, creating it...');
      const newFreelancerRole = await Role.create({
        name: 'freelancer',
        description: 'Freelancer with booking management permissions',
        permissions: [
          'view_bookings', 'manage_bookings', 'update_booking_status',
          'view_services', 'view_profile', 'update_profile',
          'view_schedule', 'update_schedule'
        ]
      });
      console.log('Created freelancer role:', newFreelancerRole.permissions);
    }

    console.log('Role update completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndUpdateRoles();
