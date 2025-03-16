import amqp from 'amqplib';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { Notification } from '../models/notification_model.js';
import { notifyWebSocketService } from '../services/websocket.service.js';

class NotificationConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
  }
  
  async connect() {
    try {
      // Connect to RabbitMQ
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();
      
      // Assert exchange and queue
      await this.channel.assertExchange(
        config.rabbitmq.exchange.name,
        config.rabbitmq.exchange.type,
        { durable: true }
      );
      
      await this.channel.assertQueue(config.rabbitmq.queue.name, { 
        durable: true 
      });
      
      await this.channel.bindQueue(
        config.rabbitmq.queue.name,
        config.rabbitmq.exchange.name,
        config.rabbitmq.queue.bindingKey
      );
      
      logger.info('Connected to RabbitMQ');
      
      // Set prefetch count to limit concurrent processing
      await this.channel.prefetch(1);
      
      // Start consuming messages
      await this.startConsuming();
      
      // Handle connection close
      this.connection.on('close', () => {
        logger.error('RabbitMQ connection closed');
        this.reconnect();
      });
      
    } catch (error) {
      logger.error('Error connecting to RabbitMQ', { error: error.message });
      this.reconnect();
    }
  }
  
  reconnect() {
    setTimeout(() => {
      logger.info('Attempting to reconnect to RabbitMQ');
      this.connect();
    }, 5000);
  }
  
  async startConsuming() {
    try {
      await this.channel.consume(config.rabbitmq.queue.name, async (msg) => {
        if (!msg) return;
        
        try {
          // Parse the message
          const notification = JSON.parse(msg.content.toString());
          logger.info(`Received notification: ${notification.id}`, { type: notification.type });
          
          // Process the notification
          await this.processNotification(notification);
          
          // Acknowledge the message
          this.channel.ack(msg);
          
        } catch (error) {
          logger.error(`Error processing message`, { error: error.message });
          
          // Reject the message and requeue if it's the first attempt
          // Otherwise, send to dead letter queue
          if (msg.fields.redelivered) {
            this.channel.reject(msg, false);
          } else {
            this.channel.reject(msg, true);
          }
        }
      }, { noAck: false });
      
      logger.info(`Started consuming from queue: ${config.rabbitmq.queue.name}`);
      
    } catch (error) {
      logger.error('Error starting consumer', { error: error.message });
      throw error;
    }
  }
  
  async processNotification(notification) {
    try {
      // Check if notification already exists in the database
      const existingNotification = await Notification.findOne({ userId: notification.userId, title: notification.title });
      if (existingNotification) {
        logger.info(`Notification already exists in MongoDB: ${notification.id}`);
        return true;
      }

      // Store in MongoDB
      const notificationDoc = new Notification({
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        body: notification.body || '',
        type: notification.type || 'default',
        urgent: notification.urgent || false,
        createdAt: notification.timestamp || new Date()
      });
      
      await notificationDoc.save();
      logger.info(`Notification saved to MongoDB: ${notification.id}`);
      
      // Notify WebSocket service for real-time delivery
      try {
        await notifyWebSocketService(notification);
        logger.info(`WebSocket service notified for notification: ${notification.id}`);
      } catch (wsError) {
        // Just log the error without failing the entire process
        logger.error(`Failed to notify WebSocket service: ${wsError.message}`);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error processing notification: ${notification.id}`, { error: error.message });
      throw error;
    }
  }
  
  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    logger.info('Closed RabbitMQ connection');
  }
}

export const notificationConsumer = new NotificationConsumer();
