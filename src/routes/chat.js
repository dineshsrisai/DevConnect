const express = require("express");
const mongoose = require("mongoose");
const { userAuth } = require("../middlewares/auth");
const { Chat } = require("../models/chat");
const ConnectionRequest = require("../models/connectionRequest");

const chatRouter = express.Router();

chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
  const { targetUserId } = req.params;
  const userId = req.user._id;

  try {
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const isConnected = await ConnectionRequest.findOne({
      status: "accepted",
      $or: [
        { fromUserId: userId, toUserId: targetUserId },
        { fromUserId: targetUserId, toUserId: userId },
      ],
    });
    if (!isConnected) {
      return res
        .status(403)
        .json({ message: "You are not connected with this user" });
    }

    let chat = await Chat.findOne({
      participants: { $all: [userId, targetUserId] },
    }).populate({
      path: "messages.senderId",
      select: "firstName lastName",
    });

    if (!chat) {
      chat = new Chat({
        participants: [userId, targetUserId],
        messages: [],
      });
      await chat.save();
    }

    res.json(chat);
  } catch (err) {
    res.status(400).json({ message: "Error fetching chat: " + err.message });
  }
});

module.exports = chatRouter;
