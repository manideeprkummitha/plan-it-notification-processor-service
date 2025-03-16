import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  body: { type: String },
  type: { type: String, default: 'default' },
  urgent: { type: Boolean, default: false },
  read: { type: Boolean, default: false },
  dismissed: { type: Boolean, default: false },
  dueDate: { type: Date },
  intervalsSent: { type: [Number], default: [] },
  createdAt: { type: Date, default: Date.now, expires: 2592000 } // 30 days TTL
});

// Create a compound index for user notifications
notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
