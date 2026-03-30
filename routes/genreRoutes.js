const express = require('express');
const router = express.Router();
const { getGenres, getGenre, updateGenre, createGenre, deleteGenre, deleteGenres } = require('../controllers/genreController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/', getGenres);
router.get('/:id', getGenre);
router.post('/', protect, authorize('admin'), createGenre);
router.put('/:id', protect, authorize('admin'), updateGenre);
router.delete('/multi', protect, authorize('admin'), deleteGenres);
router.delete('/:id', protect, authorize('admin'), deleteGenre);

module.exports = router;
