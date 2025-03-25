const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const StoreItem = require('../models/storeModel');
const mongoose = require('mongoose');

// Equip item route (keep this)
router.post('/equip-item', async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in');
        return res.redirect('/login');
    }

    try {
        const { itemId, itemType } = req.body;
        const item = await StoreItem.findById(itemId);

        const user = await User.findById(req.user._id);
        const ownedItem = user.profileItems.find(i => 
            i.itemId.toString() === itemId.toString()
        );
        
        if (!ownedItem) {
            req.flash('error', 'You do not own this item');
            return res.redirect('/profile');
        }

        await User.updateOne(
            { _id: req.user._id },
            { 
                $set: { 
                    [`equippedItems.${itemType}`]: '',
                    'profileItems.$[elem].equipped': false 
                }
            },
            { arrayFilters: [{ 'elem.itemId': new mongoose.Types.ObjectId(itemId) }] }
        );

        await User.updateOne(
            { _id: req.user._id },
            { 
                $set: { 
                    [`equippedItems.${itemType}`]: item.imageUrl,
                    'profileItems.$[elem].equipped': true 
                }
            },
            { 
                arrayFilters: [{ 
                    'elem.itemId': new mongoose.Types.ObjectId(itemId),
                    'elem.profileDisplay': itemType 
                }] 
            }
        );

        req.flash('success', `${item.name} equipped!`);
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error equipping item');
        res.redirect('/profile');
    }
});

// Sell item route (keep this)
router.post('/sell-item', async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in to sell items.');
        return res.redirect('/login');
    }

    const { itemId } = req.body;

    try {
        const item = await StoreItem.findById(itemId);
        if (!item) {
            req.flash('error', 'Item not found.');
            return res.redirect('/store');
        }

        const user = await User.findById(req.user._id);
        const ownedItem = user.items.find(i => 
            i.toString() === itemId.toString()
        );

        if (!ownedItem) {
            req.flash('error', `You do not own this item.`);
            return res.redirect('/profile');
        }

        const refundAmount = Math.floor(item.price * 0.8);
        
        await User.findByIdAndUpdate(
            req.user._id,
            { 
                $pull: { items: itemId },
                $inc: { points: refundAmount } 
            }
        );

        await StoreItem.findByIdAndUpdate(itemId, { available: true });
        
        req.flash('success', `Sold ${item.name} for ${refundAmount} points!`);
        res.redirect('/profile');
    } catch (err) {
        console.error('Error selling item:', err);
        req.flash('error', 'Failed to sell item. Please try again.');
        res.redirect('/profile');
    }
});

// Add friend route (simplified version)
router.post('/add-friend', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            req.flash('error', 'You must be logged in');
            return res.redirect('/login');
        }

        const { friendId } = req.body;
        
        await User.findByIdAndUpdate(
            req.user._id,
            { $addToSet: { friends: friendId } }
        );

        await User.findByIdAndUpdate(
            friendId,
            { $addToSet: { friends: req.user._id } }
        );

        req.flash('success', 'Friend added successfully!');
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error adding friend');
        res.redirect('/profile');
    }
});

// Remove friend route (simplified version)
router.post('/remove-friend', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            req.flash('error', 'You must be logged in');
            return res.redirect('/login');
        }

        const { friendId } = req.body;
        
        await User.findByIdAndUpdate(
            req.user._id,
            { $pull: { friends: friendId } }
        );

        await User.findByIdAndUpdate(
            friendId,
            { $pull: { friends: req.user._id } }
        );

        req.flash('success', 'Friend removed successfully!');
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error removing friend');
        res.redirect('/profile');
    }
});
router.get('/profile', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            req.flash('error', 'You must be logged in to view profiles.');
            return res.redirect('/login');
        }

        const user = await User.findById(req.user._id)
            .populate('friends', 'username profilePicture')
            .populate('items')
            .populate('profileItems.itemId');

        // Get other users (excluding current user and existing friends)
        const otherUsers = await User.find({
            _id: { $ne: req.user._id },
            _id: { $nin: user.friends.map(f => f._id) }
        }).select('username profilePicture');

        res.render('profile', {
            title: 'Profile',
            user,
            otherUsers,
            currentUserId: req.user._id.toString(),
            messages: req.flash()
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error fetching profile data.');
        res.redirect('/');
    }
});

module.exports = router;