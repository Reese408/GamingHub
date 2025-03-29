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
        try {
            fs.mkdirSync(uploadPath, { recursive: true });
        } catch (err) {
            console.error('Error creating upload directory:', err);
            return cb(err);
        }
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

        // Validate that required fields are present
        if (!name || !category || !description) {
            console.log('Validation failed - missing fields');
            fs.unlinkSync(req.file.path);
            req.flash('error', 'Name, price, description, and category are required');
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

        // Clean up the uploaded file in case of error
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

// Buy handler
exports.buyItem = async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in to buy items.');
        return res.redirect('/login');
    }

    const { itemId } = req.body;
    const userId = req.user._id;

    try {
        // Fetch the item
        const item = await StoreItem.findById(itemId);
        if (!item) {
            req.flash('error', 'Item not found.');
            console.log('Item not found:', itemId);
            return res.redirect('/store');
        }

        // Check if item is available
        if (!item.available) {
            req.flash('error', 'Item is no longer available.');
            return res.redirect('/store');
        }

        // Fetch the user
        const user = await User.findById(userId);
        console.log('User:', user);
        console.log('User Points:', user.points);
        console.log('Item Price:', item.price);

        // Check if the user has enough points
        if (user.points < item.price) {
            req.flash('error', `You need ${item.price} points to buy this item. You only have ${user.points} points.`);
            console.log('Not enough points:', user.points, item.price);
            return res.redirect('/store');
        }

        // Deduct points
        user.points -= item.price;

        // Initialize fields if they don't exist
        user.equippedItems = user.equippedItems || { background: '', badge: '', frame: '' };
        user.backgrounds = user.backgrounds || [];

        // Update inventory or equipped items based on item category
        if (item.category === 'profile') {
            if (item.name.includes('Background')) {
                user.backgrounds.push(item.imageUrl);  // Add background to the array
            } else {
                user.equippedItems.background = item.imageUrl;  // Replace background if not in array
            }
        } else {
            user.items = user.items || [];  // Ensure user has an items array if it doesn't exist
            user.items.push(itemId);  // Add item to inventory
        }

        // Save user
        await user.save();
        console.log('User inventory updated:', user.items);

        // Mark the item as unavailable in the store
        await StoreItem.findByIdAndUpdate(itemId, { available: false });
        console.log('Item marked as unavailable:', itemId);

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
