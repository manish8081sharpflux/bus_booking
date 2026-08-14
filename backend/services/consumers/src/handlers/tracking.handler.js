async function handleTrackingEvent(event) {
  // TODO: persist tracking history and optional alerts
  console.log('[consumers] tracking event', event.eventType);
}

module.exports = { handleTrackingEvent };
