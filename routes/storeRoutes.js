const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const upload = storeController.upload;

// Changed from '/store' to '/'
router.get('/', storeController.getStoreItems);
router.post('/add-item', upload.single('image'), storeController.addStoreItem);
router.post('/buy-item', storeController.buyItem);
router.post('/sell-item', storeController.sellItem);

module.exports = router;