const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/barber-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('Connected to MongoDB');

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    // Check all collections for documents
    for (const collection of collections) {
        const count = await mongoose.connection.db.collection(collection.name).countDocuments();
        console.log(`${collection.name}: ${count} documents`);
    }

    // Check if there are any users
    if (collections.find(c => c.name === 'users')) {
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        console.log('Users found:', users.length);
        if (users.length > 0) {
            users.forEach(user => {
                console.log(`- ${user.email}: ${user.role}`);
            });
        }
    }

    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
