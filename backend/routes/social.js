const express = require('express');
const multer  = require('multer');
const path    = require('path');
const {
  followUser, unfollowUser, getFollowing, getFollowers,
  createPost, getPostFeed, getUserPosts, deletePost,
} = require('../controllers/socialController');

const router = express.Router();

// Multer for post media uploads (photos/videos)
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (_req, file, cb) => cb(null, `post_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ── Follow graph ─────────────────────────────────────────────────────────────
router.post('/:userId/follow',    followUser);
router.delete('/:userId/follow',  unfollowUser);
router.get('/:userId/following',  getFollowing);
router.get('/:userId/followers',  getFollowers);

// ── Posts ─────────────────────────────────────────────────────────────────────
router.post('/posts',             upload.single('media'), createPost);
router.get('/posts/feed/:userId', getPostFeed);
router.get('/posts/user/:userId', getUserPosts);
router.delete('/posts/:postId',   deletePost);

module.exports = router;
