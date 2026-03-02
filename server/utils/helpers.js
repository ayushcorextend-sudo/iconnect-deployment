const Notification = require("../models/Notification");
const Activity = require("../models/Activity");

const notify = async ({ recipient, type, title, message, channel = "in_app", relatedModel, relatedId }) => {
  try {
    return await Notification.create({ recipient, type, title, message, channel, relatedModel, relatedId });
  } catch (error) {
    console.error("Failed to create notification:", error.message);
  }
};

const logActivity = async ({ user, action, description, metadata, ipAddress }) => {
  try {
    return await Activity.create({ user, action, description, metadata, ipAddress });
  } catch (error) {
    console.error("Failed to log activity:", error.message);
  }
};

module.exports = { notify, logActivity };
