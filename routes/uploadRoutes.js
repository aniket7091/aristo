const express = require('express');
const multer = require('multer');
const { uploadMenuImage } = require('../controllers/uploadController');
const { protectOwner } = require('../middleware/authMiddleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

router.post('/menu-image', protectOwner, upload.single('image'), uploadMenuImage);

module.exports = router;
