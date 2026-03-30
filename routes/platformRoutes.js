const express = require('express');
const router = express.Router();
const { getPlatforms, getPlatform, updatePlatform, createPlatform, deletePlatform, deletePlatforms } = require('../controllers/platformController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/', getPlatforms);
router.get('/:id', getPlatform);
router.post('/', protect, authorize('admin'), createPlatform);
router.put('/:id', protect, authorize('admin'), updatePlatform);
router.delete('/multi', protect, authorize('admin'), deletePlatforms);
router.delete('/:id', protect, authorize('admin'), deletePlatform);

module.exports = router;
