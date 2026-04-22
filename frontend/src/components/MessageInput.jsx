import React, { useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSocket } from "../context/SocketContext";
import api from '../api.js'
import { addMessage } from "../redux/chatSlice";
import { FaPaperPlane, FaFaceSmile, FaImage } from "react-icons/fa6";
import EmojiPicker from "emoji-picker-react";

const MessageInput = () => {
  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();
  const socket = useSocket();
  const { currentChat } = useSelector((state) => state.chat);
  const { userData } = useSelector((state) => state.user);

  const handleEmojiClick = (emojiObject) => {
    setContent((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentChat) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await api.post(
        `/api/chat/${currentChat._id}/messages`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      dispatch(addMessage(res.data));
      socket?.emit("send_message", {
        chatId: currentChat._id,
        message: res.data,
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
        { content: content.trim() }
      );

      dispatch(addMessage(res.data));
      socket?.emit("send_message", {
        chatId: currentChat._id,
        message: res.data,
      });

      setContent("");
    } catch (error) {
      console.error("Send message failed:", error);
    }
  };

  return (
    <div className="relative">
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-0 z-50">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme="dark"
            width={300}
            height={400}
          />
        </div>
      )}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700/30 bg-slate-900/80 backdrop-blur-xl">
        <div className="flex gap-3 items-center">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-3 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition rounded-xl hover:shadow-lg hover:shadow-cyan-500/10"
          >
            <FaFaceSmile className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-3 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition rounded-xl hover:shadow-lg hover:shadow-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <svg className="w-5 h-5 animate-spin text-cyan-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <FaImage className="w-5 h-5" />
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-5 py-3 rounded-2xl bg-slate-800/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:bg-slate-800/80 transition-all border border-slate-700/50"
          />
          <button
            type="submit"
            disabled={!content.trim()}
            className="flex items-center justify-center p-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-2xl hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-cyan-500 disabled:hover:to-cyan-600 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
          >
            <FaPaperPlane className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;