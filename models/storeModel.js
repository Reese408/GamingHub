// models/storeModel.js
const mongoose = require('mongoose');

const storeItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: String,
    imageUrl: String
});

const StoreItem = mongoose.model('StoreItem', storeItemSchema);
module.exports = StoreItem;
