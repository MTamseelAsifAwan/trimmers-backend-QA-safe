require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models/User');
const ShopOwner = require('./src/models/ShopOwner');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');

  try {
    // Check if User exists
    const existingUser = await User.findOne({ email: 'awan@gmail.com' });
    if (existingUser) {
      console.log('User already exists:', existingUser._id);
      // Update shop owner to reference this user
      await ShopOwner.findByIdAndUpdate('68e633211e7d74532ac5c6ab', { userId: existingUser._id });
      console.log('Shop owner updated with userId');
    } else {
      console.log('User does not exist, creating one...');
      // Create a User document
      const newUser = new User({
        email: 'awan@gmail.com',
        password: 'Shopowner123!',
        firstName: 'Aftab',
        lastName: 'Awan',
        role: 'shop_owner',
        countryId: '68bd2258c8c787159e5b538f', // Pakistan
        isActive: true,
        emailVerified: true,
        status: 'active'
      });
      await newUser.save();
      console.log('User created:', newUser._id);

      // Update shop owner to reference this user
      await ShopOwner.findByIdAndUpdate('68e633211e7d74532ac5c6ab', { userId: newUser._id });
      console.log('Shop owner updated with userId');
    }

  } catch (error) {
    console.error('Error:', error);
  }

  mongoose.connection.close();
}).catch(err => {
  console.error('Connection error:', err);
  process.exit(1);
});