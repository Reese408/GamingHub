const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    bio: { type: String, default: "" },               // New field for bio
    profilePicture: { type: String, default: "/images/default-profile.png" },     // URL to profile picture
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of friends
    points: { type: Number, default: 0 },              // Points for the user
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StoreItem' }],
    isAdmin: { 
        type: Boolean, 
        default: false 
    },
    profileItems: [{
        itemId: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: 'StoreItem' 
        },
        equipped: {
          type: Boolean,
          default: false
        },
        obtainedAt: {
          type: Date,
          default: Date.now
        }
      }],
      equippedItems: {
        background: { type: String, default: '' },
        badge: { type: String, default: '' },
        frame: { type: String, default: '' }
      }
});

// Hash password before saving the user
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to compare passwords during login
userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;