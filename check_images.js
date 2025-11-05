require('dotenv').config();
const mongoose = require('mongoose');

async function checkFreelancers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barber-app');
        const Freelancer = require('./src/models/Freelancer');

        
        // Get total count
        const totalCount = await Freelancer.countDocuments();
        console.log(`Total freelancers: ${totalCount}`);

        // Get freelancers with images
        const freelancersWithImages = await Freelancer.find({
            profileImage: { $ne: null, $ne: '' }
        }).select('firstName lastName profileImage createdAt').sort({ createdAt: -1 }).limit(10);

        console.log('\nFreelancers with images:');
        freelancersWithImages.forEach(f => {
            console.log(`${f.firstName} ${f.lastName} (${f.createdAt}): ${f.profileImage}`);
        });

        // Get most recent freelancers
        const recentFreelancers = await Freelancer.find({})
            .select('firstName lastName profileImage createdAt')
            .sort({ createdAt: -1 })
            .limit(5);

        console.log('\nMost recent freelancers:');
        recentFreelancers.forEach(f => {
            console.log(`${f.firstName} ${f.lastName} (${f.createdAt}): ${f.profileImage || 'no image'}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkFreelancers();