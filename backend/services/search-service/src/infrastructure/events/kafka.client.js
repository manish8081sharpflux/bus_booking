const { Kafka } = require('kafkajs');
const { KAFKA_BROKERS, KAFKA_CLIENT_ID } = require('../../config/env');

const kafka = new Kafka({ clientId: KAFKA_CLIENT_ID, brokers: KAFKA_BROKERS });

module.exports = { kafka };
