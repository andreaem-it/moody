/**
 * socialController
 * Handles the social graph (follows) and posts.
 * Post media uploads are stored in Firebase Storage.
 */

const followRepository   = require('../repositories/followRepository');
const postRepository     = require('../repositories/postRepository');
const eventRepository    = require('../repositories/eventRepository');
const profileRepository  = require('../repositories/profileRepository');
const { uploadBuffer, postMediaPath } = require('../services/storageService');

// ── Follow / Unfollow ────────────────────────────────────────────────────────

async function followUser(req, res, next) {
  try {
    const { userId }   = req.params;
    const { followerId } = req.body;
    if (!followerId) return res.status(400).json({ error: 'followerId is required' });
    if (followerId === userId) return res.status(400).json({ error: 'Cannot follow yourself' });
    const result = await followRepository.follow(followerId, userId);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function unfollowUser(req, res, next) {
  try {
    const { userId }   = req.params;
    const { followerId } = req.body;
    if (!followerId) return res.status(400).json({ error: 'followerId is required' });
    await followRepository.unfollow(followerId, userId);
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function getFollowing(req, res, next) {
  try {
    const { userId }  = req.params;
    const following   = await followRepository.getFollowing(userId);
    res.json({ userId, following, count: following.length });
  } catch (err) { next(err); }
}

async function getFollowers(req, res, next) {
  try {
    const { userId }  = req.params;
    const followers   = await followRepository.getFollowers(userId);
    res.json({ userId, followers, count: followers.length });
  } catch (err) { next(err); }
}

// ── Posts ─────────────────────────────────────────────────────────────────────

async function createPost(req, res, next) {
  try {
    const { userId, eventId, caption } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    let mediaUrl  = null;
    let mediaType = 'photo';

    if (req.file) {
      const storagePath = postMediaPath(userId, req.file.mimetype);
      mediaUrl  = await uploadBuffer(req.file.buffer, req.file.mimetype, storagePath);
      mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'photo';
    }

    // Validate event and fetch denormalized fields
    let eventTitle = null, eventLocation = null, eventDate = null;
    if (eventId) {
      const event = await eventRepository.findById(eventId);
      if (!event) return res.status(404).json({ error: 'Event not found' });
      eventTitle    = event.title;
      eventLocation = event.location;
      eventDate     = event.date;
    }

    // Fetch author info for denormalization
    const profile          = await profileRepository.createIfNotExists(userId);
    const authorDisplayName = profile.displayName ?? null;
    const authorAvatarUrl   = profile.avatarUrl   ?? null;

    const post = await postRepository.create({
      userId,
      eventId:          eventId         ?? null,
      mediaUrl,
      mediaType,
      caption:          caption         || '',
      eventTitle,
      eventLocation,
      eventDate,
      authorDisplayName,
      authorAvatarUrl,
    });

    res.status(201).json(post);
  } catch (err) { next(err); }
}

async function getPostFeed(req, res, next) {
  try {
    const { userId } = req.params;
    const posts      = await postRepository.getFeedForUser(userId);
    res.json({ posts });
  } catch (err) { next(err); }
}

async function getUserPosts(req, res, next) {
  try {
    const { userId } = req.params;
    const posts      = await postRepository.getByUser(userId);
    res.json({ posts });
  } catch (err) { next(err); }
}

async function deletePost(req, res, next) {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    await postRepository.delete(postId, userId);
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { followUser, unfollowUser, getFollowing, getFollowers, createPost, getPostFeed, getUserPosts, deletePost };
