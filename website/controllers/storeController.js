// controllers/storeController.js
const StoreItem = require('../models/storeModel');

const getStoreItems = async (req, res) => {
    try {
        const items = await StoreItem.find();
        res.render('store', { items });
    } catch (err) {
        res.status(500).send('Error retrieving store items');
    }
};

module.exports = { getStoreItems };
