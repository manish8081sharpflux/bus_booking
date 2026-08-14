async function handleBookingEvent(event) {
  // TODO: persist projection updates and trigger notifications
  console.log('[consumers] booking event', event.eventType);
}

module.exports = { handleBookingEvent };
