const express = require('express');
const controller = require('../controllers/search.controller');

const router = express.Router();

router.get('/trips', controller.searchTrips);

module.exports = router;
