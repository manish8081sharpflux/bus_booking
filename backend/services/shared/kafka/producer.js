const { createLogger } = require('../logger');
const config = require('../config');
const logger = createLogger(config.serviceName || 'kafka-producer');

let Kafka = null;
try { Kafka = require('kafkajs'); } catch (e) { /* optional */ }

async function createProducer(options = {}) {
  if (!Kafka) {
    logger.warn('kafkajs not available, producer will be a no-op');
    return {
      connect: async () => {},
      send: async (opts) => { logger.info('kafka-send-noop', opts); },
      disconnect: async () => {},
    };
  }
  const brokers = options.client?.brokers || (process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const clientConfig = Object.assign({}, options.client || {}, brokers.length ? { brokers } : {});
  const kafka = new Kafka.Kafka(clientConfig);
  const producer = kafka.producer(options.producer || {});
  return producer;
}

module.exports = { createProducer };
