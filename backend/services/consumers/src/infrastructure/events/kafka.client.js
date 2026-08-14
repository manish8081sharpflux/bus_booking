const { Kafka } = require('kafkajs');
const { KAFKA_BROKERS, KAFKA_CLIENT_ID, KAFKA_GROUP_ID } = require('../../config/env');

const kafka = new Kafka({ clientId: KAFKA_CLIENT_ID, brokers: KAFKA_BROKERS });
const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });

module.exports = { consumer };
