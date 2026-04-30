const express = require('express');
const multer  = require('multer');
const { getProfile, updateProfile, updatePreferences } = require('../controllers/profileController');
const { getUserActivity }           = require('../controllers/activityController');

const router = express.Router();

// Memory storage — controller uploads buffer directly to Firebase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.get('/:userId',                getProfile);
router.put('/:userId',                upload.single('avatar'), updateProfile);
router.patch('/:userId/preferences',  updatePreferences);
router.get('/:userId/activity',       getUserActivity);

module.exports = router;
