/**
 * socialController
 * Handles the social graph (follows) and posts.
 */

const path = require('path');
const followRepository = require('../repositories/followRepository');
const postRepository   = require('../repositories/postRepository');
const eventRepository  = require('../repositories/eventRepository');

// ── Follow / Unfollow ────────────────────────────────────────────────────────

async function followUser(req, res, next) {
  try {
    const { userId } = req.params;          // the person being followed
    const { followerId } = req.body;

    if (!followerId) return res.status(400).json({ error: 'followerId is required' });
    if (followerId === userId) return res.status(400).json({ error: 'Cannot follow yourself' });

    const result = followRepository.follow(followerId, userId);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function unfollowUser(req, res, next) {
  try {
    const { userId } = req.params;
    const { followerId } = req.body;
    if (!followerId) return res.status(400).json({ error: 'followerId is required' });
    followRepository.unfollow(followerId, userId);
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function getFollowing(req, res, next) {
  try {
    const { userId } = req.params;
    const following = followRepository.getFollowing(userId);
    res.json({ userId, following, count: following.length });
  } catch (err) { next(err); }
}

async function getFollowers(req, res, next) {
  try {
    const { userId } = req.params;
    const followers = followRepository.getFollowers(userId);
    res.json({ userId, followers, count: followers.length });
  } catch (err) { next(err); }
}

// ── Posts ─────────────────────────────────────────────────────────────────────

async function createPost(req, res, next) {
  try {
    const { userId, eventId, caption } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    let mediaUrl = null;
    let mediaType = 'photo';

    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
      mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'photo';
    }

    // Validate event if provided
    if (eventId) {
      const event = eventRepository.findById(eventId);
      if (!event) return res.status(404).json({ error: 'Event not found' });
    }

    const post = postRepository.create({ userId, eventId: eventId || null, mediaUrl, mediaType, caption: caption || '' });
    res.status(201).json(post);
  } catch (err) { next(err); }
}

async function getPostFeed(req, res, next) {
  try {
    const { userId } = req.params;
    const posts = postRepository.getFeedForUser(userId);
    res.json({ posts });
  } catch (err) { next(err); }
}

async function getUserPosts(req, res, next) {
  try {
    const { userId } = req.params;
    const posts = postRepository.getByUser(userId);
    res.json({ posts });
  } catch (err) { next(err); }
}

async function deletePost(req, res, next) {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    postRepository.delete(postId, userId);
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { followUser, unfollowUser, getFollowing, getFollowers, createPost, getPostFeed, getUserPosts, deletePost };
