const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address']
  },
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  password: { 
    type: String, 
    required: true,
    minlength: 8
  },
  bio: { 
    type: String, 
    default: '',
    maxlength: 500 
  },
  profilePicture: { 
    type: String, 
    default: '/images/default.png' 
  },
  friends: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  points: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  items: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'StoreItem' 
  }],
  isAdmin: { 
    type: Boolean, 
    default: false 
  },
  rpsStats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    lastPlayed: { type: Date }
  },
  // Backgrounds stored as direct URLs
  backgrounds: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr) {
        return arr.every(url => typeof url === 'string' && url.startsWith('/uploads/'));
      },
      message: 'Backgrounds must be valid upload paths'
    }
  },
  // Purchased items including backgrounds
  profileItems: [{
    itemId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'StoreItem',
      required: true 
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
  // Currently equipped items
  equippedItems: {
    background: { 
      type: String, 
      default: '',
      validate: {
        validator: function(v) {
          return v === '' || v.startsWith('/uploads/');
        },
        message: 'Background must be a valid upload path'
      }
    },
    badge: { 
      type: String, 
      default: '' 
    },
    frame: { 
      type: String, 
      default: '' 
    }
  },
  wins: { 
    type: Number, 
    default: 0 
  },
  losses: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for all available backgrounds (combines both sources)
userSchema.virtual('allBackgrounds').get(function() {
  const itemBackgrounds = this.profileItems
    .filter(item => item.itemId?.profileDisplay === 'background')
    .map(item => item.itemId.imageUrl);
  
  return [...new Set([...this.backgrounds, ...itemBackgrounds])];
});

// Virtual for win/loss ratio
userSchema.virtual('winRatio').get(function() {
  if (this.losses === 0) return this.wins;
  return (this.wins / this.losses).toFixed(2);
});

// Virtual for RPS win ratio
userSchema.virtual('rpsWinRatio').get(function() {
  if (this.rpsStats.losses === 0) return this.rpsStats.wins;
  return (this.rpsStats.wins / this.rpsStats.losses).toFixed(2);
});

// Virtual for total RPS games played
userSchema.virtual('rpsTotalGames').get(function() {
  return this.rpsStats.wins + this.rpsStats.losses + this.rpsStats.draws;
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Update timestamp middleware
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to add a background
userSchema.methods.addBackground = function(backgroundUrl) {
  if (!this.backgrounds.includes(backgroundUrl)) {
    this.backgrounds.push(backgroundUrl);
  }
  return this.save();
};

// Method to equip a background
userSchema.methods.equipBackground = function(backgroundUrl) {
  if (this.allBackgrounds.includes(backgroundUrl)) {
    this.equippedItems.background = backgroundUrl;
    return this.save();
  }
  throw new Error('User does not own this background');
};

const User = mongoose.model('User', userSchema);

module.exports = User;