require('dotenv').config();
const mongoose = require('mongoose');
const Barber = require('./src/models/Barber');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');

  try {
    // Find all barbers
    const allBarbers = await Barber.find({});
    console.log('All barbers count:', allBarbers.length);

    // Find pending barbers (verificationStatus: 'pending')
    const pendingBarbers = await Barber.find({ verificationStatus: 'pending' });
    console.log('Pending barbers count:', pendingBarbers.length);

    if (pendingBarbers.length > 0) {
      console.log('Pending barbers:');
      pendingBarbers.forEach((barber, index) => {
        console.log(`${index + 1}. ID: ${barber._id}, Email: ${barber.email}, Name: ${barber.firstName} ${barber.lastName}, Verification Status: ${barber.verificationStatus}`);
        console.log(`   Service Type: ${barber.serviceType}, Status: ${barber.status}`);
        console.log('---');
      });
    } else {
      console.log('No pending barbers found');
    }

    // Also check for barbers with status: 'pending' (which would be wrong)
    const wrongStatusBarbers = await Barber.find({ status: 'pending' });
    console.log('Barbers with status="pending" (should be verificationStatus):', wrongStatusBarbers.length);

    if (wrongStatusBarbers.length > 0) {
      console.log('Barbers with incorrect status:');
      wrongStatusBarbers.forEach((barber, index) => {
        console.log(`${index + 1}. ID: ${barber._id}, Email: ${barber.email}, Status: ${barber.status}, Verification Status: ${barber.verificationStatus}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }

  mongoose.connection.close();
}).catch(err => {
  console.error('Connection error:', err);
  process.exit(1);
});