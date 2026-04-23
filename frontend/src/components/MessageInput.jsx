import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSocket } from "../context/SocketContext";
import api from '../api.js'
import { addMessage, setReplyingTo } from "../redux/chatSlice";
import { FaPaperPlane, FaImage, FaXmark, FaReply, FaFaceSmile } from "react-icons/fa6";
import EmojiPicker from 'emoji-picker-react';

const MessageInput = () => {
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const dispatch = useDispatch();
  const socket = useSocket();
  const { currentChat, replyingTo } = useSelector((state) => state.chat);
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    return () => {
      // Cleanup: stop typing when component unmounts or chat changes
      if (socket && currentChat && isTyping) {
        socket.emit("typing_stop", { 
          chatId: currentChat._id, 
          userId: userData._id,
          userName: userData.name || userData.username
        });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentChat, socket, userData, isTyping]);

  const handleInputChange = (e) => {
    setContent(e.target.value);
    
    if (socket && currentChat && !isTyping) {
      socket.emit("typing_start", { 
        chatId: currentChat._id, 
        userId: userData._id,
        userName: userData.name || userData.username
      });
      setIsTyping(true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && currentChat && isTyping) {
        socket.emit("typing_stop", { 
          chatId: currentChat._id, 
          userId: userData._id,
          userName: userData.name || userData.username
        });
        setIsTyping(false);
      }
    }, 1000);
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentChat) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    if (replyingTo) {
      formData.append("replyTo", replyingTo._id);
    }

    try {
      const res = await api.post(
        `/api/chat/${currentChat._id}/messages`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      dispatch(addMessage(res.data));
      dispatch(setReplyingTo(null));
      socket?.emit("send_message", {
        chatId: currentChat._id,
        message: res.data,
        senderId: userData._id,
      });
    } catch (error) {
      console.error("Send image failed:", error);
    } finally {
      setUploading(false);
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !currentChat) return;

    try {
      const res = await api.post(
        `/api/chat/${currentChat._id}/messages`,
        { 
          content: content.trim(),
          replyTo: replyingTo?._id || null
        }
      );

      dispatch(addMessage(res.data));
      dispatch(setReplyingTo(null));
      setContent("");
      socket?.emit("send_message", {
        chatId: currentChat._id,
        message: res.data,
        senderId: userData._id,
      });
      
      // Stop typing
      if (isTyping) {
        socket?.emit("typing_stop", { 
          chatId: currentChat._id, 
          userId: userData._id,
          userName: userData.name || userData.username
        });
        setIsTyping(false);
      }
    } catch (error) {
      console.error("Send message failed:", error);
    }
  };

  const handleCancelReply = () => {
    dispatch(setReplyingTo(null));
  };

  const handleEmojiClick = (emojiObject) => {
    setContent(content + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="relative">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-2 sm:px-4 py-2 bg-slate-800/50 border-t border-slate-700/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FaReply className="w-3 h-3 text-cyan-400 rotate-180 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-cyan-400 font-medium">Replying to {replyingTo.sender?.username || 'message'}</p>
              <p className="text-xs text-slate-400 truncate">{replyingTo.content}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelReply}
            className="p-1 text-slate-400 hover:text-red-400 transition flex-shrink-0"
          >
            <FaXmark className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="p-2 sm:p-4 border-t border-slate-700/30 bg-slate-900/80 backdrop-blur-xl">
        <div className="flex gap-2 sm:gap-3 items-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 sm:p-3 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <FaFaceSmile className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            {showEmojiPicker && (
              <div 
                ref={emojiPickerRef}
                className="absolute bottom-full left-0 mb-2 z-40"
              >
                <EmojiPicker 
                  onEmojiClick={handleEmojiClick}
                  theme="dark"
                  searchDisabled={false}
                  width={300}
                  height={400}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 sm:p-3 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FaImage className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <textarea
            value={content}
            onChange={handleInputChange}
            placeholder="Type a message..."
            rows={2}
            className="flex-1 resize-none px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-800/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:bg-slate-800/80 transition-all border border-slate-700/50 text-sm"
          />
          <button
            type="submit"
            disabled={!content.trim()}
            className="flex items-center justify-center p-2.5 sm:p-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl sm:rounded-2xl hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-cyan-500 disabled:hover:to-cyan-600 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
          >
            <FaPaperPlane className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </form>
    </div>

  );
};

export default MessageInput;