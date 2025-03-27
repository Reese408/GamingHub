const StoreItem = require('../models/storeModel');
const User = require('../models/userModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage with better error handling
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'public/uploads/';
        // Ensure directory exists
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// Add file filtering
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Add a new store item (improved version)
exports.addStoreItem = async (req, res) => {
    console.log('Add item request received');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    if (!req.file) {
        console.log('No file uploaded');
        req.flash('error', 'No image file provided');
        return res.redirect('/store');
    }

    try {
        const { name, price, description, category } = req.body;
        console.log('Received fields:', { name, price, description, category });

        // Validate price is a valid number
        const parsedPrice = parseInt(price);
        if (isNaN(parsedPrice)) {
            console.log('Validation failed - invalid price');
            fs.unlinkSync(req.file.path);
            req.flash('error', 'Price must be a valid number');
            return res.redirect('/store');
        }

        if (!name || !category) {
            console.log('Validation failed - missing fields');
            fs.unlinkSync(req.file.path);
            req.flash('error', 'Name, price and category are required');
            return res.redirect('/store');
        }

        const newItem = new StoreItem({
            name,
            price: parsedPrice,
            description,
            category,
            imageUrl: '/uploads/' + req.file.filename,
            available: true
        });

        console.log('Creating new item:', newItem);
        await newItem.save();
        
        req.flash('success', 'Item added successfully!');
        res.redirect('/store');
    } catch (err) {
        console.error('Error adding item:', err);
        
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.error('Failed to delete uploaded file:', err);
            }
        }

        req.flash('error', 'Error adding item: ' + err.message);
        res.redirect('/store');
    }
};
//buy handler
exports.buyItem = async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in to buy items.');
        return res.redirect('/login');
    }

    const { itemId } = req.body;
    const userId = req.user._id;

    try {
        const item = await StoreItem.findById(itemId);
        if (!item) {
            req.flash('error', 'Item not found.');
            return res.redirect('/store');
        }

        const user = await User.findById(userId);

        if (user.points < item.price) {
            req.flash('error', `You need ${item.price} points to buy this item. You only have ${user.points} points.`);
            return res.redirect('/store');
        }

        // Deduct points
        user.points -= item.price;

        if (item.category === 'profile') {
            // This is a background item, equip it instead of adding to the inventory
            user.equippedItems = user.equippedItems || {};
            user.equippedItems.background = item.imageUrl;
        } else {
            // This is a regular item, add it to the inventory
            user.items.push(itemId);
        }

        await user.save();

        // Mark item as unavailable (optional)
        await StoreItem.findByIdAndUpdate(itemId, { available: false });

        req.flash('success', `Item purchased successfully! ${item.price} points deducted.`);
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error purchasing item.');
        res.redirect('/store');
    }
};


// Handle selling an item back to the store
exports.sellItem = async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in to sell items.');
        return res.redirect('/login');
    }

    try {
        const { itemId } = req.body;
        const userId = req.user._id;

        // Find user with items populated
        const user = await User.findById(userId).populate('items');
        
        // Check if user owns the item
        const itemToSell = user.items.find(item => item._id.toString() === itemId);
        if (!itemToSell) {
            req.flash('error', 'Item not found in your inventory.');
            return res.redirect('/profile');
        }

        // Calculate refund
        const refundAmount = Math.floor(itemToSell.price * 0.8);

        // Update user and item
        await User.findByIdAndUpdate(userId, {
            $pull: { items: itemId },
            $inc: { points: refundAmount }
        });

        await StoreItem.findByIdAndUpdate(itemId, { available: true });

        req.flash('success', `Sold ${itemToSell.name} for ${refundAmount} points!`);
        return res.redirect('/profile');
        
    } catch (err) {
        console.error('Error selling item:', err);
        req.flash('error', 'Failed to sell item. Please try again.');
        return res.redirect('/profile');
    }
};

// Get store items
exports.getStoreItems = async (req, res) => {
    try {
        const storeItems = await StoreItem.find({ available: true });
        res.render('store', { 
            title: 'Store',
            storeItems,
            user: req.user || null,
            messages: req.flash()
        });
    } catch (err) {
        console.error('Error fetching store items:', err);
        req.flash('error', 'Failed to load store items');
        res.render('store', { 
            title: 'Store',
            storeItems: [],
            user: req.user || null,
            messages: req.flash()
        });
    }
};

// Export the upload middleware for use in routes
exports.upload = upload;
