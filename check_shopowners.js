require('dotenv').config();
const mongoose = require('mongoose');
const ShopOwner = require('./src/models/ShopOwner');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');

  try {
    // Find all shop owners
    const allShopOwners = await ShopOwner.find({});
    console.log('All shop owners count:', allShopOwners.length);

    // Find pending shop owners
    const pendingShopOwners = await ShopOwner.find({ verificationStatus: 'pending' });
    console.log('Pending shop owners count:', pendingShopOwners.length);

    if (pendingShopOwners.length > 0) {
      console.log('Pending shop owners:');
      pendingShopOwners.forEach((so, index) => {
        console.log(`${index + 1}. ID: ${so._id}, Email: ${so.email}, Business Name: ${so.businessName}, Verification Status: ${so.verificationStatus}`);
        console.log(`   UserId: ${so.userId}, FirstName: ${so.firstName}, LastName: ${so.lastName}`);
        console.log('---');
      });
    } else {
      console.log('No pending shop owners found');
    }

    // Check the specific shop owner
    const specificShopOwner = await ShopOwner.findById('68e633211e7d74532ac5c6ab');
    if (specificShopOwner) {
      console.log('Specific shop owner found:');
      console.log(`ID: ${specificShopOwner._id}`);
      console.log(`Email: ${specificShopOwner.email}`);
      console.log(`FirstName: ${specificShopOwner.firstName}`);
      console.log(`LastName: ${specificShopOwner.lastName}`);
      console.log(`Business Name: ${specificShopOwner.businessName}`);
      console.log(`Verification Status: ${specificShopOwner.verificationStatus}`);
      console.log(`UserId: ${specificShopOwner.userId}`);
      console.log(`Created: ${specificShopOwner.createdAt}`);
    } else {
      console.log('Specific shop owner not found');
    }

  } catch (error) {
    console.error('Error:', error);
  }

  mongoose.connection.close();
}).catch(err => {
  console.error('Connection error:', err);
  process.exit(1);
});