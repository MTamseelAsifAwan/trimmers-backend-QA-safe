require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');
const Barber = require('./src/models/Barber');

// Use the same connection string as the app
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/barber-app';

console.log(`🔗 Connecting to: ${uri.includes('mongodb+srv') ? 'MongoDB Atlas (Cloud)' : 'Local MongoDB'}\n`);

// Connect to MongoDB
mongoose.connect(uri).then(async () => {
    console.log('✅ Connected to MongoDB\n');

    try {
        const email = 'barber-2@example.com';
        
        // Find the barber
        const barber = await Barber.findOne({ email });
        
        if (!barber) {
            console.log(`❌ Barber not found with email: ${email}`);
            process.exit(1);
        }

        console.log('📋 Barber Details:');
        console.log('━'.repeat(50));
        console.log(`Email: ${barber.email}`);
        console.log(`ID: ${barber._id}`);
        console.log(`Name: ${barber.firstName} ${barber.lastName}`);
        console.log(`Phone: ${barber.phoneNumber || 'N/A'}`);
        console.log(`Email Verified: ${barber.emailVerified ? '✅' : '❌'}`);
        console.log(`Status: ${barber.status || 'N/A'}`);
        console.log(`Role: ${barber.role || 'N/A'}`);
        console.log('━'.repeat(50));
        
        // Check password field
        console.log('\n🔐 Password Information:');
        console.log('━'.repeat(50));
        
        if (!barber.password) {
            console.log('❌ NO PASSWORD STORED - This is the problem!');
            console.log('   The barber account exists but has no password hash.');
            console.log('   This user cannot log in until a password is set.');
        } else {
            console.log('✅ Password hash exists');
            console.log(`   Hash: ${barber.password.substring(0, 20)}...`);
            console.log(`   Length: ${barber.password.length} characters`);
            
            // Check if it looks like a valid bcrypt hash
            const isBcrypt = barber.password.startsWith('$2a$') || 
                            barber.password.startsWith('$2b$') || 
                            barber.password.startsWith('$2y$');
            
            if (isBcrypt) {
                console.log('   Format: ✅ Valid bcrypt hash');
            } else {
                console.log('   Format: ⚠️  Does not look like bcrypt hash');
            }
            
            // Test password comparison
            console.log('\n🧪 Testing password "Paswword123!":');
            try {
                const isMatch = await barber.matchPassword('Paswword123!');
                if (isMatch) {
                    console.log('   ✅ Password matches!');
                } else {
                    console.log('   ❌ Password does NOT match');
                    console.log('   Either the password is wrong or the hash is corrupted.');
                }
            } catch (error) {
                console.log('   ❌ Error during password comparison:');
                console.log(`   ${error.message}`);
            }
        }
        
        console.log('━'.repeat(50));
        
        // Check all barbers to see if this is a common issue
        console.log('\n📊 Checking all barbers for missing passwords:');
        console.log('━'.repeat(50));
        const allBarbers = await Barber.find({}, 'email password emailVerified');
        const barbersWithoutPassword = allBarbers.filter(b => !b.password);
        
        console.log(`Total barbers: ${allBarbers.length}`);
        console.log(`Barbers with password: ${allBarbers.length - barbersWithoutPassword.length}`);
        console.log(`Barbers WITHOUT password: ${barbersWithoutPassword.length}`);
        
        if (barbersWithoutPassword.length > 0) {
            console.log('\n⚠️  Barbers without passwords:');
            barbersWithoutPassword.forEach(b => {
                console.log(`   - ${b.email} (${b._id})`);
            });
        }
        
        console.log('━'.repeat(50));
        
    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}).catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});
