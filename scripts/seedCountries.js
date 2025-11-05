const mongoose = require('mongoose');
const Country = require('../src/models/Country');

mongoose.connect('mongodb://localhost:27017/barber-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function seedCountries() {
  try {
    await Country.deleteMany({});
    const countries = [
      { name: 'Pakistan', code: 'PK', currency: { code: 'PKR', symbol: '₨' }, status: 'active' },
      { name: 'United States', code: 'US', currency: { code: 'USD', symbol: '$' }, status: 'active' },
      { name: 'United Kingdom', code: 'GB', currency: { code: 'GBP', symbol: '£' }, status: 'active' }
    ];
    for (const data of countries) {
      await Country.create(data); // uses model defaults for uid
    }
    console.log('Countries added!');
    mongoose.connection.close();
  } catch (err) {
    console.error('Error seeding countries:', err);
    mongoose.connection.close();
  }
}

seedCountries();
