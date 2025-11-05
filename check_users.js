const mongoose = require('mongoose');
const Customer = require('./src/models/Customer');

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/barber-app');

    const customers = await Customer.find({}, 'email firstName lastName emailVerified isActive');
    console.log('Customers in database:');
    customers.forEach(customer => {
      console.log('- Email:', customer.email, 'Verified:', customer.emailVerified, 'Active:', customer.isActive);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();
