function createEnvelope({ eventId, eventType, eventVersion, aggregateType, aggregateId, occurredAt, producer, requestId, payload }) {
  return {
    eventId: eventId || (Date.now().toString(36) + Math.random().toString(36).slice(2)),
    eventType,
    eventVersion: eventVersion || '1',
    aggregateType: aggregateType || null,
    aggregateId: aggregateId || null,
    occurredAt: occurredAt || new Date().toISOString(),
    producer: producer || null,
    requestId: requestId || null,
    payload: payload || null,
  };
}

function validateEnvelope(e) {
  if (!e || typeof e !== 'object') return false;
  return !!(e.eventId && e.eventType && e.occurredAt && e.payload);
}

module.exports = { createEnvelope, validateEnvelope };
