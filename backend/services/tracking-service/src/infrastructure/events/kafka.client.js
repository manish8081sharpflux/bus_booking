const { Kafka } = require('kafkajs');
const { KAFKA_BROKERS, KAFKA_CLIENT_ID } = require('../../config/env');

const kafka = new Kafka({ clientId: KAFKA_CLIENT_ID, brokers: KAFKA_BROKERS });
const producer = kafka.producer();

async function connectProducer() {
  await producer.connect();
  console.log('[tracking-service] Kafka producer connected');
}

module.exports = { producer, connectProducer };
