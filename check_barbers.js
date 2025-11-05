const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/trimmers', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('Connected to MongoDB');

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    // Check barbers collection
    const barbers = await mongoose.connection.db.collection('barbers').find({}).toArray();
    console.log('Total barbers found:', barbers.length);

    if (barbers.length > 0) {
        console.log('Barber UIDs:');
        barbers.forEach(barber => {
            console.log(`- ${barber.uid}: ${barber.location ? `Lat: ${barber.location.latitude}, Lng: ${barber.location.longitude}` : 'No location'}`);
        });
    }

    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
