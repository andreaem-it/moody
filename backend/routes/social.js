const express = require('express');
const multer  = require('multer');
const {
  followUser, unfollowUser, getFollowing, getFollowers,
  createPost, getPostFeed, getUserPosts, deletePost,
} = require('../controllers/socialController');

const router = express.Router();

// Memory storage — controller uploads buffer directly to Firebase Storage
const upload = multer({
  storage: multer.memoryStorage(),
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
