const mongoose = require('mongoose');
const Shop = require('./src/models/Shop');

async function checkShopSchedule() {
    try {
        await mongoose.connect('mongodb+srv://danyroyal:Barbershop123!@barber-app-dany.pi0cdf9.mongodb.net/barber-app?retryWrites=true&w=majority');
        console.log('Connected to MongoDB');

        const shops = await Shop.find({}).limit(5);
        console.log('First 5 shops:', shops.map(s => ({ id: s._id, name: s.name })));

        if (shops.length > 0) {
            const firstShop = shops[0];
            console.log('First shop opening hours:', JSON.stringify(firstShop.openingHours, null, 2));
        }

        const shop = await Shop.findById('68be83c37461fe135c3ea28e');
        if (shop) {
            console.log('Shop Name:', shop.name);
            console.log('Opening Hours:', JSON.stringify(shop.openingHours, null, 2));
        } else {
            console.log('Shop not found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkShopSchedule();