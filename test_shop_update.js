// Test script for shop update approval workflow
// Run this with: node test_shop_update.js

const axios = require('axios');
require('dotenv').config();

// Test configuration
const BASE_URL = 'http://localhost:3000'; // Adjust if your server runs on different port
const TEST_SHOP_OWNER_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token
const TEST_SHOP_ID = 'YOUR_SHOP_ID_HERE'; // Replace with actual shop ID

async function testShopUpdate() {
    try {
        const updateData = {
            name: "Updated Premium Shop Name",
            location: {
                address: "Updated address",
                latitude: 31.54006233783586,
                longitude: 74.32988818734884
            },
            services: ["haircut", "beard_trim", "styling"]
        };

        console.log('Testing shop update endpoint...');
        console.log('Update data:', JSON.stringify(updateData, null, 2));

        const response = await axios.put(
            `${BASE_URL}/api/shops/${TEST_SHOP_ID}`,
            updateData,
            {
                headers: {
                    'Authorization': `Bearer ${TEST_SHOP_OWNER_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('\nResponse Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));

        if (response.data.message && response.data.message.includes('approval')) {
            console.log('\n✅ SUCCESS: Shop update sent for approval as expected!');
        } else {
            console.log('\n⚠️  WARNING: Response doesn\'t mention approval workflow');
        }

    } catch (error) {
        console.error('\nError testing shop update:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Instructions for manual testing
console.log('📋 MANUAL TESTING INSTRUCTIONS:');
console.log('1. Update TEST_SHOP_OWNER_TOKEN with a valid JWT token');
console.log('2. Update TEST_SHOP_ID with a valid shop ID');
console.log('3. Ensure your server is running on the correct port');
console.log('4. Run: node test_shop_update.js');
console.log('\nOr test manually with curl:');
console.log(`curl -X PUT "${BASE_URL}/api/shops/YOUR_SHOP_ID" \\`);
console.log('  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"name":"Test Shop","location":{"address":"Test Address","latitude":31.5,"longitude":74.3},"services":["haircut"]}\'');

// Only run if tokens are provided
if (TEST_SHOP_OWNER_TOKEN !== 'YOUR_JWT_TOKEN_HERE' && TEST_SHOP_ID !== 'YOUR_SHOP_ID_HERE') {
    testShopUpdate();
} else {
    console.log('\n⚠️  Please update the tokens and shop ID before running the test');
}