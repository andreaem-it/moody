const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore }                 = require('firebase-admin/firestore');
const { getStorage }                   = require('firebase-admin/storage');

let _db;
let _bucket;

function initializeDatabase() {
  if (_db) return _db;

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }

  _db = getFirestore();
  _db.settings({ ignoreUndefinedProperties: true });
  _bucket = getStorage().bucket();

  console.log('✅ Firebase Admin SDK initialized');
  return _db;
}

function getDb() {
  if (!_db) initializeDatabase();
  return _db;
}

function getBucket() {
  if (!_bucket) initializeDatabase();
  return _bucket;
}

module.exports = { initializeDatabase, getDatabase: getDb, getDb, getBucket };
