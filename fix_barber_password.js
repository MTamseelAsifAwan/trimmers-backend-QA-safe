require('dotenv').config();
const mongoose = require('mongoose');
const Barber = require('./src/models/Barber');
const bcrypt = require('bcryptjs');

// Use the same connection string as the app
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/barber-app';

console.log('🔗 Connecting to MongoDB Atlas...\n');

mongoose.connect(uri).then(async () => {
    console.log('✅ Connected to MongoDB\n');

    try {
        const email = 'barber-2@example.com';
        const newPassword = 'Password123!'; // Correct password (not "Paswword")
        
        // Find the barber
        const barber = await Barber.findOne({ email });
        
        if (!barber) {
            console.log(`❌ Barber not found with email: ${email}`);
            process.exit(1);
        }

        console.log('📋 Current Status:');
        console.log('━'.repeat(60));
        console.log(`Email: ${barber.email}`);
        console.log(`Name: ${barber.firstName} ${barber.lastName}`);
        console.log(`Password exists: ${barber.password ? '✅ Yes' : '❌ No'}`);
        console.log('━'.repeat(60));
        
        // Hash the password
        console.log('\n🔐 Setting password...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        console.log(`Generated hash: ${hashedPassword.substring(0, 30)}...`);
        
        // Update using findOneAndUpdate to bypass pre-save hook issues
        const result = await Barber.findOneAndUpdate(
            { email },
            { 
                $set: { password: hashedPassword }
            },
            { 
                new: true,
                runValidators: false // Skip validation since password is required
            }
        );
        
        if (!result) {
            console.log('❌ Failed to update barber');
            process.exit(1);
        }
        
        console.log('✅ Password set successfully!\n');
        
        // Verify the password was saved correctly (explicitly select password field)
        const updatedBarber = await Barber.findOne({ email }).select('+password');
        
        console.log('🧪 Verification:');
        console.log('━'.repeat(60));
        console.log(`Password stored: ${updatedBarber.password ? ' Yes' : ' No'}`);
        
        if (updatedBarber.password) {
            console.log(`Hash preview: ${updatedBarber.password.substring(0, 30)}...`);
            
            // Test password match
            const isMatch = await bcrypt.compare(newPassword, updatedBarber.password);
            console.log(`Password verification: ${isMatch ? ' Success' : ' Failed'}`);
            
            if (isMatch) {
                console.log('\n✨ SUCCESS! You can now login with:');
                console.log(`   Email: ${email}`);
                console.log(`   Password: ${newPassword}`);
            }
        }
        console.log('━'.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}).catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
});
