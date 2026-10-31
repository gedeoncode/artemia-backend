const Notification = require('../../models/Notification.model');

exports.getNotifications = async (req, res) => {
  const notifications = await Notification.find().sort({ createdAt: -1 });
  res.json(notifications);
};

exports.markNotificationRead = async (req, res) => {
  const { id } = req.params;
  await Notification.findByIdAndUpdate(id, { isRead: true });
  res.json({ message: 'Notification marked as read' });
};
