import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import uploadOnCloudinary from "../config/cloudinary.js";

// Get all chats for a user
export const getChats = async (req, res) => {
  try {
    const userId = req.userId;
    const chats = await Chat.find({
      participants: userId
    })
    .populate("participants", "username name image")
    .populate("lastMessage")
    .sort({ updatedAt: -1 });

    res.status(200).json(chats);
  } catch (error) {
    console.error("getChats error:", error);
    res.status(500).json({ message: "Failed to get chats" });
  }
};

// Create a new chat (direct message)
export const createChat = async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.userId;

    if (!participantId) {
      return res.status(400).json({ message: "Participant ID required" });
    }

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      participants: { $all: [userId, participantId] },
      isGroup: false
    });

    if (existingChat) {
      return res.status(200).json(existingChat);
    }

    const chat = await Chat.create({
      participants: [userId, participantId]
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate("participants", "username name image");

    res.status(201).json(populatedChat);
  } catch (error) {
    console.error("createChat error:", error);
    res.status(500).json({ message: "Failed to create chat" });
  }
};

// Get messages for a chat
export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    // Verify user is participant
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await Message.find({ chat: chatId })
      .populate("sender", "username name image")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("getMessages error:", error);
    res.status(500).json({ message: "Failed to get messages" });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType = "text" } = req.body;
    const userId = req.userId;

    if (!chatId || (!content && !req.file)) {
      return res.status(400).json({ message: "Chat ID and content or image required" });
    }

    // Verify user is participant
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    let messageContent = content || "";
    let messageTypeFinal = messageType;

    // Handle image upload
    if (req.file) {
      // Upload to Cloudinary
      const cloudinaryUrl = await uploadOnCloudinary(req.file.path);
      messageContent = cloudinaryUrl;
      messageTypeFinal = "image";
    }

    const message = await Message.create({
      chat: chatId,
      sender: userId,
      content: messageContent,
      messageType: messageTypeFinal
    });

    // Update chat's last message
    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username name image");

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};