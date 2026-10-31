const mongoose  = require("mongoose");
const Notification = require("../../models/Notification.model");
// 📬 Get all notifications for a seller
const getNotifications = async (req, res) => {
  try {
    const sellerId = new mongoose.Types.ObjectId(req.seller.id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // FIXED: Correct $elemMatch
    const matchQuery = {
      recipients: {
        $elemMatch: {
          userId: sellerId,
          userType: "Seller",
        },
      },
    };

    // Count total & unread
    const [totalCount, unreadCount] = await Promise.all([
      Notification.countDocuments(matchQuery),
      Notification.countDocuments({
        recipients: {
          $elemMatch: {
            userId: sellerId,
            userType: "Seller",
            read: false,
          },
        },
      }),
    ]);

    // FIXED aggregation
    const notifications = await Notification.aggregate([
      { $match: matchQuery },

      {
        $addFields: {
          matchedRecipient: {
            $first: {
              $filter: {
                input: "$recipients",
                cond: {
                  $and: [
                    { $eq: ["$$this.userId", sellerId] },
                    { $eq: ["$$this.userType", "Seller"] },
                  ],
                },
              },
            },
          },
        },
      },

      { $sort: { "matchedRecipient.read": 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    return res.status(200).json({
      data: notifications,
      page,
      totalPages,
      totalCount,
      unreadCount,
    });
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
};




// 🟢 Mark a notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.seller.id;

    if (!notificationId || !userId) {
      return res.status(400).json("Missing fields");
    }
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        "recipients.userId": userId,
      },
      {
        $set: { "recipients.$.read": true, "recipients.$.readAt": new Date() },
      },
      { new: true }
    );

    if (!notification) {
      return res.status(400).json("Not found");
    }
    res.status(200).json({ message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update notification" });
  }
};


const markAllAsRead = async (req, res) => {
  try {
    const sellerId = req.seller.id;

    const updated = await Notification.updateMany(
      {
        "recipients.userId": sellerId,
        "recipients.userType": "Seller",
        "recipients.read": false,
      },
      {
        $set: {
          "recipients.$[elem].read": true,
          "recipients.$[elem].readAt": new Date(),
        },
      },
      {
        arrayFilters: [{ "elem.userId": sellerId }],
      }
    );

    return res.status(200).json({
      message: "All notifications marked as read",
      matched: updated.matchedCount,
      modified: updated.modifiedCount,
    });
  } catch (err) {
    console.error("markAllNotificationsRead error:", err);
    return res
      .status(500)
      .json({ message: "Failed to mark all notifications as read" });
  }
};



module.exports = { getNotifications, markAsRead, markAllAsRead };
