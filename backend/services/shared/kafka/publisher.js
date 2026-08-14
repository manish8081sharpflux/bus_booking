const { createProducer } = require('./producer');
const { createEnvelope } = require('./envelope');

async function publishEvent({ topic, eventType, aggregateType, aggregateId, producerOptions = {}, requestId, producer, payload }) {
  const kafkaProducer = producer || (await createProducer(producerOptions));
  if (!kafkaProducer.send) throw new Error('Kafka producer not available');
  const envelope = createEnvelope({
    eventType,
    aggregateType,
    aggregateId,
    producer,
    requestId,
    payload,
  });
  return kafkaProducer.send({
    topic,
    messages: [
      {
        key: envelope.eventId,
        value: JSON.stringify(envelope),
        headers: { requestId: envelope.requestId || '' }
      }
    ]
  });
}

module.exports = { publishEvent };
