const express = require('express');
const { upload, uploadAndProcess } = require('../controllers/uploadController');

const router = express.Router();

// POST /upload  (multipart/form-data, field name: "image")
router.post('/', upload.single('image'), uploadAndProcess);

module.exports = router;
