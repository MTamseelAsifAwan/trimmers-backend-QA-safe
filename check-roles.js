const mongoose = require('mongoose');
const Role = require('./src/models/Role');

async function checkRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://usmanliaqat61:mOnoTQwQctoPUaSf@rmgdb.fm5aagk.mongodb.net/barber-app-live?retryWrites=true&w=majority');

    console.log('Checking roles in database...');

    const roles = await Role.find({});
    console.log('\n=== EXISTING ROLES ===');
    roles.forEach(role => {
      console.log(`Role: ${role.name}`);
      console.log(`Permissions: ${role.permissions.join(', ')}`);
      console.log('---');
    });

    // Check if barber and freelancer roles have manage_bookings
    const barberRole = roles.find(r => r.name === 'barber');
    const freelancerRole = roles.find(r => r.name === 'freelancer');

    if (barberRole && !barberRole.permissions.includes('manage_bookings')) {
      console.log('❌ Barber role missing manage_bookings permission');
      await Role.findByIdAndUpdate(barberRole._id, {
        $addToSet: { permissions: 'manage_bookings' }
      });
      console.log('✅ Added manage_bookings to barber role');
    }

    if (freelancerRole && !freelancerRole.permissions.includes('manage_bookings')) {
      console.log('❌ Freelancer role missing manage_bookings permission');
      await Role.findByIdAndUpdate(freelancerRole._id, {
        $addToSet: { permissions: 'manage_bookings' }
      });
      console.log('✅ Added manage_bookings to freelancer role');
    }

    console.log('\n=== UPDATED ROLES ===');
    const updatedRoles = await Role.find({});
    updatedRoles.forEach(role => {
      console.log(`Role: ${role.name}`);
      console.log(`Permissions: ${role.permissions.join(', ')}`);
      console.log('---');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRoles();
