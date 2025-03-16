import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

const WEBSOCKET_API_URL = process.env.WEBSOCKET_API_URL || 'http://localhost:4001/api/notify';

export async function notifyWebSocketService(notification) {
  try {
    const response = await fetch(WEBSOCKET_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: notification.userId,
        notification: {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          type: notification.type,
          urgent: notification.urgent,
          timestamp: notification.timestamp || new Date().toISOString()
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`WebSocket API responded with status ${response.status}: ${JSON.stringify(errorData)}`);
    }
    
    const result = await response.json();
    logger.info(`Notification sent to WebSocket service successfully for user ${notification.userId}`);
    return result;
    
  } catch (error) {
    logger.error(`Failed to notify WebSocket service for user ${notification.userId}`, { 
      error: error.message, 
      notification: notification.id
    });
    // Don't throw the error to prevent the notification from being requeued
    // The notification is already saved in MongoDB, even if the WebSocket delivery fails
  }
}