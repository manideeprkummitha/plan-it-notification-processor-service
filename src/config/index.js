import dotenv from 'dotenv';
dotenv.config();

export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/notifications'
  },
  
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    exchange: {
      name: process.env.RABBITMQ_EXCHANGE || 'notifications.exchange',
      type: 'topic'
    },
    queue: {
      name: process.env.RABBITMQ_QUEUE || 'notifications.queue',
      bindingKey: 'notification.#'
    }
  }
};