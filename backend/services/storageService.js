/**
 * storageService
 *
 * Centralises all Firebase Storage upload operations.
 * Uploads are made public immediately so the returned URL is stable
 * and requires no signing or token refresh.
 */

const { v4: uuidv4 } = require('uuid');
const { getBucket }  = require('../db/database');

/**
 * Uploads a Buffer to Firebase Storage and returns a permanent public URL.
 *
 * @param {Buffer}  buffer      - Raw file bytes.
 * @param {string}  mimetype    - MIME type (e.g. 'image/jpeg').
 * @param {string}  storagePath - Full path inside the bucket (e.g. 'events/uuid/img.jpg').
 * @returns {Promise<string>}   Public HTTPS URL.
 */
async function uploadBuffer(buffer, mimetype, storagePath) {
  const bucket = getBucket();
  const file   = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: { contentType: mimetype },
    resumable: false,
  });

  await file.makePublic();
  return file.publicUrl();
}

/**
 * Generates a unique storage path for an event image upload.
 * @param {string} mimetype
 */
function eventImagePath(mimetype) {
  const ext = _ext(mimetype);
  return `events/${uuidv4()}/image${ext}`;
}

/**
 * Generates a unique storage path for a user avatar.
 * @param {string} userId
 * @param {string} mimetype
 */
function avatarPath(userId, mimetype) {
  const ext = _ext(mimetype);
  return `users/${userId}/avatar${ext}`;
}

/**
 * Generates a unique storage path for a post media file.
 * @param {string} userId
 * @param {string} mimetype
 */
function postMediaPath(userId, mimetype) {
  const ext = _ext(mimetype);
  return `posts/${userId}/${uuidv4()}${ext}`;
}

/**
 * Deletes a file from storage by its public URL or storage path.
 * Silently ignores errors (file may not exist).
 * @param {string} fileUrl  - Full public URL of the file.
 */
async function deleteByUrl(fileUrl) {
  try {
    const bucket     = getBucket();
    const bucketName = bucket.name;
    const prefix     = `https://storage.googleapis.com/${bucketName}/`;
    if (!fileUrl?.startsWith(prefix)) return;
    const storagePath = decodeURIComponent(fileUrl.slice(prefix.length));
    await bucket.file(storagePath).delete();
  } catch (_) { /* non-blocking */ }
}

function _ext(mimetype) {
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg':  '.jpg',
    'image/png':  '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'video/mp4':  '.mp4',
    'video/quicktime': '.mov',
  };
  return map[mimetype] || '';
}

module.exports = { uploadBuffer, eventImagePath, avatarPath, postMediaPath, deleteByUrl };
