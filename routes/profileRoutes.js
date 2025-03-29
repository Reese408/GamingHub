const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const StoreItem = require('../models/storeModel');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

/* ---------------------- MAIN PROFILE PAGE ---------------------- */
router.get('/', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            req.flash('error', 'You must be logged in to view profiles.');
            return res.redirect('/login');
        }

        const user = await User.findById(req.user._id)
            .populate('friends', 'username profilePicture')
            .populate('items')
            .populate('profileItems.itemId');

        const otherUsers = await User.find({
            _id: { $ne: req.user._id },
            _id: { $nin: user.friends.map(f => f._id) }
        }).select('username profilePicture');

        const backgroundImage = user.equippedItems.background;

        res.render('profile', {
            title: 'Profile',
            user,
            otherUsers,
            currentUserId: req.user._id.toString(),
            backgroundImage,
            messages: req.flash()
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error fetching profile data.');
        res.redirect('/');
    }
});

/* ---------------------- OTHER USER'S PROFILE PAGE ---------------------- */
router.get('/:userId', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            req.flash('error', 'You must be logged in to view profiles.');
            return res.redirect('/login');
        }

        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            req.flash('error', 'Invalid user ID.');
            return res.redirect('/profile');
        }

        const userProfile = await User.findById(userId)
            .populate('friends', 'username profilePicture')
            .populate('items')
            .populate('profileItems.itemId');

        if (!userProfile) {
            req.flash('error', 'User not found.');
            return res.redirect('/profile');
        }

        const otherUsers = await User.find({
            _id: { $ne: userId },
            _id: { $nin: userProfile.friends.map(f => f._id) }
        }).select('username profilePicture');

        res.render('friends', {
            title: `${userProfile.username}'s Profile`,
            user: userProfile,
            friends: userProfile.friends,
            isCurrentUser: req.user._id.toString() === userId,
            otherUsers,
            messages: req.flash()
        });
    } catch (err) {
        console.error('Error fetching user profile:', err);
        req.flash('error', 'Error loading profile.');
        res.redirect('/profile');
    }
});

/* ---------------------- UPDATE BIO ---------------------- */
router.post('/update-bio', async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in.');
        return res.redirect('/login');
    }

    try {
        const { bio } = req.body;
        if (!bio) {
            req.flash('error', 'Bio cannot be empty.');
            return res.redirect('/profile');
        }

        await User.findByIdAndUpdate(req.user._id, { bio }, { new: true });
        req.flash('success', 'Bio updated successfully!');
    } catch (err) {
        console.error('Error updating bio:', err);
        req.flash('error', 'Failed to update bio.');
    }
    res.redirect('/profile');
});

/* ---------------------- UPLOAD PROFILE PICTURE ---------------------- */
router.post('/upload-profile-picture', upload.single('profilePicture'), async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in.');
        return res.redirect('/login');
    }

    if (!req.file) {
        req.flash('error', 'No file uploaded.');
        return res.redirect('/profile');
    }

    try {
        await User.findByIdAndUpdate(
            req.user._id,
            { profilePicture: `/uploads/${req.file.filename}` },
            { new: true }
        );
        req.flash('success', 'Profile picture updated successfully!');
    } catch (err) {
        console.error('Error updating profile picture:', err);
        req.flash('error', 'Failed to update profile picture.');
    }
    res.redirect('/profile');
});

/* ---------------------- ADD FRIEND ---------------------- */
router.post('/add-friend', async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in.');
        return res.redirect('/login');
    }

    try {
        const { friendId } = req.body;
        const currentUser = await User.findById(req.user._id);
        if (currentUser.friends.includes(friendId)) {
            req.flash('error', 'You are already friends with this user.');
            return res.redirect('/profile');
        }

        await User.findByIdAndUpdate(req.user._id, { $addToSet: { friends: friendId } });
        await User.findByIdAndUpdate(friendId, { $addToSet: { friends: req.user._id } });

        req.flash('success', 'Friend added successfully!');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error adding friend.');
    }
    res.redirect('/profile');
});

/* ---------------------- REMOVE FRIEND ---------------------- */
router.post('/remove-friend', async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in.');
        return res.redirect('/login');
    }

    try {
        const { friendId } = req.body;
        await User.findByIdAndUpdate(req.user._id, { $pull: { friends: friendId } });
        await User.findByIdAndUpdate(friendId, { $pull: { friends: req.user._id } });

        req.flash('success', 'Friend removed successfully!');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error removing friend.');
    }
    res.redirect('/profile');
});

/* ---------------------- UPDATE WIN/LOSS RECORD ---------------------- */
router.post('/update-record', async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in.');
        return res.redirect('/login');
    }

    const { result, opponentId } = req.body;

    if (!['win', 'loss'].includes(result)) {
        req.flash('error', 'Invalid game result.');
        return res.redirect('/profile');
    }

    try {
        const currentUser = await User.findById(req.user._id);
        const opponent = await User.findById(opponentId);

        if (!opponent) {
            req.flash('error', 'Opponent not found.');
            return res.redirect('/profile');
        }

        if (result === 'win') {
            currentUser.wins += 1;
            opponent.losses += 1;
        } else if (result === 'loss') {
            currentUser.losses += 1;
            opponent.wins += 1;
        }

        await currentUser.save();
        await opponent.save();

        req.flash('success', `You ${result} the game!`);
    } catch (err) {
        console.error('Error updating win/loss record:', err);
        req.flash('error', 'Failed to update win/loss record.');
    }

    res.redirect('/profile');
});

/* ---------------------- SELL ITEM ---------------------- */
router.post('/sell-item', async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in.');
        return res.redirect('/login');
    }

    try {
        const { itemId } = req.body;
        if (!itemId) {
            req.flash('error', 'Invalid item.');
            return res.redirect('/profile');
        }

        const item = await StoreItem.findById(itemId);
        if (!item) {
            req.flash('error', 'Item not found.');
            return res.redirect('/profile');
        }

        const user = await User.findById(req.user._id);
        const itemIdObj = new mongoose.Types.ObjectId(itemId);

        if (!user.items.some(id => id.equals(itemIdObj))) {
            req.flash('error', 'You do not own this item.');
            return res.redirect('/profile');
        }

        const refundAmount = Math.floor(item.price * 0.8);

        await User.findByIdAndUpdate(req.user._id, {
            $pull: { items: itemIdObj },
            $inc: { points: refundAmount }
        });

        await StoreItem.findByIdAndUpdate(itemId, { available: true });

        req.flash('success', `Sold ${item.name} for ${refundAmount} points!`);
    } catch (err) {
        console.error('Error selling item:', err);
        req.flash('error', 'Failed to sell item.');
    }

    res.redirect('/profile');
});

/* ---------------------- EQUIP BACKGROUND ---------------------- */
router.post('/equip-background', async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in.');
        return res.redirect('/login');
    }

    try {
        const { backgroundUrl } = req.body;

        if (!backgroundUrl) {
            req.flash('error', 'Invalid background selection.');
            return res.redirect('/profile');
        }

        const user = await User.findById(req.user._id);

        if (!user.backgrounds.includes(backgroundUrl)) {
            req.flash('error', 'You do not own this background.');
            return res.redirect('/profile');
        }

        await User.findByIdAndUpdate(req.user._id, { 
            'equippedItems.background': backgroundUrl 
        });

        req.flash('success', 'Background equipped successfully!');
    } catch (err) {
        console.error('Error equipping background:', err);
        req.flash('error', 'Failed to equip background.');
    }
    res.redirect('/profile');
});

/* ---------------------- UPDATE BACKGROUND ---------------------- */
router.post('/update-background', async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in.');
        return res.redirect('/login');
    }

    try {
        const { backgroundId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(backgroundId)) {
            req.flash('error', 'Invalid background ID.');
            return res.redirect('/profile');
        }

        const user = await User.findById(req.user._id);
        const ownedBackground = user.profileItems.find(item => 
            item.itemId.toString() === backgroundId
        );

        if (!ownedBackground) {
            req.flash('error', 'You do not own this background.');
            return res.redirect('/profile');
        }

        await User.findByIdAndUpdate(req.user._id, { 
            'equippedItems.background': backgroundId 
        });

        req.flash('success', 'Background updated successfully!');
    } catch (err) {
        console.error('Error updating background:', err);
        req.flash('error', 'Failed to update background.');
    }

    res.redirect('/profile');
});

module.exports = router;