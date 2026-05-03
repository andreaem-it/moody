'use strict';

const express    = require('express');
const controller = require('../controllers/organizerController');

const router = express.Router();

// POST   /organizers/register           — registra un nuovo organizzatore
// GET    /organizers/packages           — elenco pacchetti acquistabili
// GET    /organizers/:userId            — profilo organizzatore
// PUT    /organizers/:userId            — aggiorna profilo
// GET    /organizers/:userId/quota      — quota attuale
// GET    /organizers/:userId/stats      — eventi + statistiche
// POST   /organizers/:userId/purchase   — richiedi acquisto pacchetto

router.post('/register',           controller.register);
router.get('/packages',            controller.getPackages);
router.get('/:userId',             controller.getProfile);
router.put('/:userId',             controller.updateProfile);
router.get('/:userId/quota',       controller.getQuota);
router.get('/:userId/stats',       controller.getEventStats);
router.post('/:userId/purchase',   controller.requestPurchase);

module.exports = router;
