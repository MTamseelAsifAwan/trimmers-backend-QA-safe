require('dotenv').config();
const mongoose = require('mongoose');
const ShopOwner = require('./src/models/ShopOwner');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');

  try {
    // Update the specific shop owner to have business fields
    const updateResult = await ShopOwner.findByIdAndUpdate(
      '68e633211e7d74532ac5c6ab',
      {
        businessName: 'Aftab Barber Shop',
        businessAddress: '123 Main Street, City',
        businessPhone: '03423121141',
        businessEmail: 'awan@gmail.com',
        taxId: 'TAX123456',
        businessRegistrationNumber: 'REG789012'
      },
      { new: true }
    );

    if (updateResult) {
      console.log('Shop owner updated successfully:');
      console.log(`Business Name: ${updateResult.businessName}`);
      console.log(`Business Address: ${updateResult.businessAddress}`);
      console.log(`Tax ID: ${updateResult.taxId}`);
      console.log(`Business Registration: ${updateResult.businessRegistrationNumber}`);
    } else {
      console.log('Shop owner not found');
    }

  } catch (error) {
    console.error('Error:', error);
  }

  mongoose.connection.close();
}).catch(err => {
  console.error('Connection error:', err);
  process.exit(1);
});