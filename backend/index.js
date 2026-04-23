import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRouter from "./routes/auth.js";
import cors from "cors";
import userRouter from "./routes/user.route.js";
import chatRouter from "./routes/chat.js";
import User from "./models/user.model.js";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://192.168.0.106:5173", "http://192.168.0.106:5174", "https://blinkupz.onrender.com"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://192.168.0.106:5173', 'http://192.168.0.106:5174', 'https://blinkupz.onrender.com'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/chat", chatRouter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, "dist")));

// SPA fallback - catch all routes that aren't API
app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, "dist/index.html"));
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

// Socket.io connection
const userSocketMap = new Map(); // userId -> Set<socketId>

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User goes online
  socket.on('go_online', async (userId) => {
    socket.userId = userId;

    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    const sockets = userSocketMap.get(userId);
    sockets.add(socket.id);

    if (sockets.size === 1) {
      try {
        await User.findByIdAndUpdate(userId, { status: 'online' });
      } catch (error) {
        console.error('Failed to update user status to online:', error);
      }
      io.emit('user_online', userId);
      console.log(`User ${userId} is now online`);
    }
  });

  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat ${chatId}`);
  });

  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId);
    console.log(`User ${socket.id} left chat ${chatId}`);
  });

  socket.on('send_message', (data) => {
    const { chatId, message, senderId } = data;
    // Broadcast to everyone in the chat
    io.to(chatId).emit('receive_message', message);
    
    // Send notification to online recipient
    const recipientId = message.recipientId;
    if (recipientId && userSocketMap.has(recipientId)) {
      const recipientSocket = userSocketMap.get(recipientId);
      io.to(recipientSocket).emit('new_message_notification', {
        chatId,
        message
      });
    }
  });

  // Mark message as seen
  socket.on('mark_seen', (data) => {
    const { chatId, messageId, userId } = data;
    io.to(chatId).emit('message_seen', { messageId, userId });
  });

  // Typing indicators
  socket.on('typing_start', (data) => {
    const { chatId, userId } = data;
    socket.to(chatId).emit('typing_start', { chatId, userId });
  });

  socket.on('typing_stop', (data) => {
    const { chatId, userId } = data;
    socket.to(chatId).emit('typing_stop', { chatId, userId });
  });

  // Get online users
  socket.on('get_online_users', (callback) => {
    callback(Array.from(userSocketMap.keys()));
  });

  socket.on('disconnect', async () => {
    if (socket.userId) {
      const sockets = userSocketMap.get(socket.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSocketMap.delete(socket.userId);
          try {
            await User.findByIdAndUpdate(socket.userId, { status: 'offline' });
          } catch (error) {
            console.error('Failed to update user status to offline:', error);
          }
          io.emit('user_offline', socket.userId);
          console.log(`User ${socket.userId} is now offline`);
        }
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// Start server after DB connection
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
    });
}).catch(err => console.error("DB connection failed:", err));
