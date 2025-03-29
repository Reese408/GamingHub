const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: "" },               // Bio field
  profilePicture: { type: String, default: "/images/default-profile.png" },     // Default profile picture
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of friends
  points: { type: Number, default: 0 },              // Points for the user
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StoreItem' }], // Items the user has
  isAdmin: { 
      type: Boolean, 
      default: false 
  },
  profileItems: [{  // Array of items the user has bought, including backgrounds
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
  backgrounds: [{  // Change from ObjectId to String for storing background image URLs
      type: String,  // Store image URLs as strings
  }],
  equippedItems: {  // Reference to the item the user currently has equipped
      background: { type: String, default: '' },  // Changed from ObjectId to String for the image URL
      badge: { type: String, default: '' },  // Badge the user has equipped
      frame: { type: String, default: '' }   // Frame the user has equipped
  },
  wins: { type: Number, default: 0 },  // User's win count
  losses: { type: Number, default: 0 } // User's loss count
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
