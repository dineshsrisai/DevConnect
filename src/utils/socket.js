const socket = require("socket.io");
const crypto = require("crypto");
const { Chat } = require("../models/chat.js");

const getSecretRoomId = (userId, targetUserId) => {
  return crypto
    .createHash("sha256")
    .update([userId, targetUserId].sort().join("_"))
    .digest("hex");
};

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: "http://localhost:5173",
    },
  });

  io.on("connection", (socket) => {
    socket.on("joinChat", ({ firstName, userId, targetUserId }) => {
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.join(roomId);
    });

    socket.on(
      "sendMessage",
      // FIX 1: Expect 'senderId' here to match what the React frontend sends
      async ({ firstName, senderId, targetUserId, text }) => {
        try {
          const roomId = getSecretRoomId(senderId, targetUserId);

          let chat = await Chat.findOne({
            participants: { $all: [senderId, targetUserId] },
          });

          if (!chat) {
            chat = new Chat({
              participants: [senderId, targetUserId], // senderId is now valid!
              messages: [],
            });
          }

          chat.messages.push({
            senderId: senderId, // Properly saves to Mongoose now
            text,
          });

          await chat.save();

          // FIX 2: Send 'senderId' back to the frontend so it knows whose chat bubble it is!
          io.to(roomId).emit("messageReceived", {
            firstName,
            senderId,
            text,
          });
        } catch (err) {
          console.log(err);
        }
      },
    );

    socket.on("disconnect", () => {});
  });
};

module.exports = initializeSocket;
