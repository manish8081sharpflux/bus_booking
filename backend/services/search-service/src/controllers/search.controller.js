const searchService = require('../services/search.service');

exports.searchTrips = async (req, res) => {
  try {
    const trips = await searchService.queryTrips(req.query);
    res.status(200).json({ success: true, data: trips });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
