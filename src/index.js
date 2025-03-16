import mongoose from 'mongoose';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { notificationConsumer } from './consumers/notification.consumer.js';

async function startService() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri);
    logger.info('Connected to MongoDB');
    
    // Connect to RabbitMQ and start consuming
    await notificationConsumer.connect();
    
    logger.info('Notification processor service started');
  } catch (error) {
    logger.error('Error starting service', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await notificationConsumer.close();
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await notificationConsumer.close();
  await mongoose.disconnect();
  process.exit(0);
});

// Start the service
startService();