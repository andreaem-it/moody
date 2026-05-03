/**
 * organizerRepository — Firestore implementation.
 *
 * Document structure (collection: 'organizers'):
 *   id, userId, venueName, contactName, email, city,
 *   description, plan, quotaTotal, quotaUsed,
 *   isActive, createdAt, updatedAt
 *
 * Relazione con gli eventi:
 *   events.organizerId === organizer.id
 */

'use strict';

const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('../db/database');
const { FieldValue } = require('firebase-admin/firestore');

const COL = 'organizers';

/** Piani disponibili con quota inclusa e prezzi per acquisti aggiuntivi. */
const PLANS = {
  free: { label: 'Free', quotaIncluded: 100, price: 0 },
};

/** Pacchetti di submission acquistabili (indipendenti dal piano). */
const PACKAGES = [
  { id: 'pack_10',  label: 'Starter',  submissions: 10,  price: 9.90,  pricePerUnit: 0.99 },
  { id: 'pack_50',  label: 'Pro',      submissions: 50,  price: 39.90, pricePerUnit: 0.80 },
  { id: 'pack_100', label: 'Business', submissions: 100, price: 69.90, pricePerUnit: 0.70 },
];

function _parse(snap) {
  if (!snap || !snap.exists) return null;
  const data = snap.data();
  return { ...data, id: snap.id };
}

const organizerRepository = {
  /** Restituisce tutti i pacchetti disponibili (dati statici). */
  getPackages() {
    return PACKAGES;
  },

  async findByUserId(userId) {
    const snap = await getDb()
      .collection(COL)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    return snap.empty ? null : _parse(snap.docs[0]);
  },

  async findById(id) {
    const snap = await getDb().collection(COL).doc(id).get();
    return _parse(snap);
  },

  async create({ userId, venueName, contactName, email, city, description = null }) {
    const id  = uuidv4();
    const now = new Date().toISOString();
    const data = {
      id,
      userId,
      venueName:   venueName.trim(),
      contactName: contactName.trim(),
      email:       email.trim().toLowerCase(),
      city:        city.trim(),
      description: description ?? null,
      plan:        'free',
      quotaTotal:  PLANS.free.quotaIncluded,
      quotaUsed:   0,
      isActive:    true,
      createdAt:   now,
      updatedAt:   now,
    };
    await getDb().collection(COL).doc(id).set(data);
    return data;
  },

  async update(id, { venueName, contactName, email, city, description }) {
    const allowed = { venueName, contactName, email, city, description };
    const updates = { updatedAt: new Date().toISOString() };
    for (const [k, v] of Object.entries(allowed)) {
      if (v !== undefined) updates[k] = typeof v === 'string' ? v.trim() : v;
    }
    await getDb().collection(COL).doc(id).update(updates);
    return this.findById(id);
  },

  /**
   * Aggiunge quota acquistata a un organizer.
   * Viene chiamata dopo conferma pagamento.
   */
  async addQuota(id, amount) {
    const now = new Date().toISOString();
    await getDb().collection(COL).doc(id).update({
      quotaTotal: FieldValue.increment(amount),
      updatedAt:  now,
    });
    return this.findById(id);
  },

  /**
   * Tenta di consumare 1 submission dalla quota.
   * Ritorna { success: true } o { success: false, reason: 'quota_exceeded' }.
   */
  async consumeQuota(id) {
    const organizer = await this.findById(id);
    if (!organizer) return { success: false, reason: 'not_found' };
    if (organizer.quotaUsed >= organizer.quotaTotal) {
      return { success: false, reason: 'quota_exceeded' };
    }
    await getDb().collection(COL).doc(id).update({
      quotaUsed:  FieldValue.increment(1),
      updatedAt:  new Date().toISOString(),
    });
    return { success: true };
  },
};

module.exports = { organizerRepository, PACKAGES, PLANS };
