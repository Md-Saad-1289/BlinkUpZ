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
    .populate("participants", "username name image status")
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
      .populate("participants", "username name image status");

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
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "username name"
        }
      })
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
    const { content, messageType = "text", replyTo } = req.body;
    const userId = req.userId;

    if (!chatId || (!content && !req.file)) {
      return res.status(400).json({ message: "Chat ID and content or image required" });
    }

    // Verify user is participant
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Verify replyTo message exists if provided
    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);
      if (!replyMessage || replyMessage.chat.toString() !== chatId) {
        return res.status(400).json({ message: "Invalid reply message" });
      }
    }

    let messageContent = content || "";
    let messageTypeFinal = messageType;

    // Handle file uploads (images and audio)
    if (req.file) {
      // Upload to Cloudinary
      const cloudinaryUrl = await uploadOnCloudinary(req.file.path);
      messageContent = cloudinaryUrl;
      messageTypeFinal = messageType === "audio" ? "audio" : "image";
    }

    const message = await Message.create({
      chat: chatId,
      sender: userId,
      content: messageContent,
      messageType: messageTypeFinal,
      replyTo: replyTo || null
    });

    // Update chat's last message
    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username name image")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "username name"
        }
      });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

// Mark messages as seen
export const markMessagesSeen = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    // Verify user is participant
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Mark all unread messages from other users as seen
    await Message.updateMany(
      { chat: chatId, sender: { $ne: userId }, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ message: "Messages marked as seen" });
  } catch (error) {
    console.error("markMessagesSeen error:", error);
    res.status(500).json({ message: "Failed to mark messages as seen" });
  }
};

// Delete a message (soft delete)
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only sender can delete their message
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    // Soft delete - mark as deleted but keep in DB
    message.deleted = true;
    message.content = "This message was deleted";
    message.messageType = "text";
    await message.save();

    res.status(200).json({ message: "Message deleted", deletedMessage: message });
  } catch (error) {
    console.error("deleteMessage error:", error);
    res.status(500).json({ message: "Failed to delete message" });
  }
};

// Edit a message
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Content is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only sender can edit their message
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: "You can only edit your own messages" });
    }

    // Can't edit deleted messages
    if (message.deleted) {
      return res.status(400).json({ message: "Cannot edit a deleted message" });
    }

    // Can't edit image messages
    if (message.messageType === "image") {
      return res.status(400).json({ message: "Cannot edit image messages" });
    }

    message.content = content;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    const populatedMessage = await Message.findById(messageId)
      .populate("sender", "username name image")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "username name"
        }
      });

    res.status(200).json({ message: "Message edited", editedMessage: populatedMessage });
  } catch (error) {
    console.error("editMessage error:", error);
    res.status(500).json({ message: "Failed to edit message" });
  }
};

