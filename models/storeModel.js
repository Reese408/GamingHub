const mongoose = require('mongoose');

const storeItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: String,
    imageUrl: String,  // For static backgrounds
    available: { type: Boolean, default: true },
    profileDisplay: {
        type: String,
        enum: ['background', 'badge', 'frame', 'emote', 'title', null],
        default: null
    },
    category: {
        type: String,
        enum: ['weapon', 'armor', 'potion', 'special', 'profile'],
        required: true
    },
    effectType: { type: String, enum: ['waves', 'particles', null], default: null }  // For animated backgrounds
});

const StoreItem = mongoose.model('StoreItem', storeItemSchema);
module.exports = StoreItem;
