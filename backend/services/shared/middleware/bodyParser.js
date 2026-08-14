const express = require('express');
const config = require('../config');

module.exports = {
  json: () => express.json({ limit: config.bodyLimit }),
  urlencoded: () => express.urlencoded({ extended: true, limit: config.bodyLimit }),
};
