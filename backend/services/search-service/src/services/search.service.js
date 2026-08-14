const TripView = require('../models/trip-view.model');

class SearchService {
  async queryTrips({ source, destination, date }) {
    const filter = {};

    if (source) filter.source = source;
    if (destination) filter.destination = destination;

    if (date) {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.departureTime = { $gte: start, $lt: end };
    }

    return TripView.find(filter).sort({ departureTime: 1 }).lean();
  }
}

module.exports = new SearchService();
