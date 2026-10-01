const socket = require("socket.io");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Chat } = require("../models/chat.js");
const User = require("../models/user.js");
const ConnectionRequest = require("../models/connectionRequest.js");

const getSecretRoomId = (userId, targetUserId) => {
  return crypto
    .createHash("sha256")
    .update([userId, targetUserId].sort().join("_"))
    .digest("hex");
};

const parseCookies = (cookieHeader = "") =>
  Object.fromEntries(
    cookieHeader
      .split(";")
      .filter(Boolean)
      .map((pair) => {
        const [key, ...rest] = pair.trim().split("=");
        return [key, decodeURIComponent(rest.join("="))];
      }),
  );

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies.token;
      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded._id).select("firstName");
      if (!user) return next(new Error("User not found"));

      socket.userId = decoded._id.toString();
      socket.firstName = user.firstName;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("joinChat", async ({ targetUserId }) => {
      try {
        const isConnected = await ConnectionRequest.findOne({
          status: "accepted",
          $or: [
            { fromUserId: socket.userId, toUserId: targetUserId },
            { fromUserId: targetUserId, toUserId: socket.userId },
          ],
        });
        if (!isConnected) return;

        const roomId = getSecretRoomId(socket.userId, targetUserId);
        socket.join(roomId);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on("sendMessage", async ({ targetUserId, text }) => {
      try {
        const senderId = socket.userId;
        const firstName = socket.firstName;
        const roomId = getSecretRoomId(senderId, targetUserId);

        let chat = await Chat.findOne({
          participants: { $all: [senderId, targetUserId] },
        });

        if (!chat) {
          chat = new Chat({
            participants: [senderId, targetUserId],
            messages: [],
          });
        }

        chat.messages.push({ senderId, text });
        await chat.save();

        io.to(roomId).emit("messageReceived", {
          firstName,
          senderId,
          text,
        });
      } catch (err) {
        console.log(err);
      }
    });

    socket.on("disconnect", () => {});
  });
};

module.exports = initializeSocket;
