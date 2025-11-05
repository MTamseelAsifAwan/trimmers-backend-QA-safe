// Debug script to check user role data
require('dotenv').config();
const mongoose = require('mongoose');
const ShopOwner = require('./src/models/ShopOwner');
const Role = require('./src/models/Role');

async function debugUserRole(email) {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Find shop owner by email
        const shopOwner = await ShopOwner.findOne({ email: email.toLowerCase() });
        
        if (!shopOwner) {
            console.log('❌ Shop owner not found');
            return;
        }
        
        console.log('✅ Shop Owner found:');
        console.log('- ID:', shopOwner._id);
        console.log('- Email:', shopOwner.email);
        console.log('- Role field:', shopOwner.role);
        console.log('- RoleId:', shopOwner.roleId);
        console.log('- IsActive:', shopOwner.isActive);
        
        // Check if roleId exists in Role collection
        if (shopOwner.roleId) {
            const role = await Role.findById(shopOwner.roleId);
            console.log('- Role document:', role ? role.name : 'NOT FOUND');
        }
        
        // Check if role exists by name
        if (shopOwner.role) {
            const roleByName = await Role.findOne({ 
                name: { $regex: new RegExp(`^\\s*${shopOwner.role}\\s*$`, 'i') } 
            });
            console.log('- Role by name:', roleByName ? roleByName.name : 'NOT FOUND');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

// Usage: node debug_user_role.js <email>
const email = process.argv[2];
if (!email) {
    console.log('Usage: node debug_user_role.js <email>');
    process.exit(1);
}

debugUserRole(email);