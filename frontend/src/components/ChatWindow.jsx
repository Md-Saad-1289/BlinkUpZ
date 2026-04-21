import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSocket } from "../context/SocketContext";
import { addMessage } from "../redux/chatSlice";
import useGetMessages from "../Hooks/useGetMessages";
import MessageInput from "./MessageInput";
import { FaPhone, FaVideo, FaEllipsisVertical, FaCheck, FaCheckDouble } from "react-icons/fa6";

// Helper to format date
const formatMessageDate = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
};

// Group messages by date
const groupMessagesByDate = (messages) => {
  const groups = {};
  messages.forEach((msg) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
  });
  return groups;
};

const ChatWindow = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { currentChat, messages } = useSelector((state) => state.chat);
  const { userData } = useSelector((state) => state.user);
  const messagesEndRef = useRef(null);

  useGetMessages(currentChat?._id);

  useEffect(() => {
    if (socket && currentChat) {
      socket.emit("join_chat", currentChat._id);

      socket.on("receive_message", (message) => {
        const exists = messages.some((m) => m._id === message._id);
        if (!exists) {
          dispatch(addMessage(message));
        }
      });

      return () => {
        socket.off("receive_message");
      };
    }
  }, [socket, currentChat, dispatch, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!currentChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-gradient-to-br from-slate-900 via-slate-900/50 to-slate-900/80">
        <div className="relative">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-slate-700/50 shadow-2xl shadow-black/30">
            <svg className="w-12 h-12 text-cyan-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
        <div className="text-center px-4 mt-8">
          <p className="text-xl font-semibold text-slate-200">Welcome to BlinkUpZ</p>
          <p className="text-sm text-slate-500 mt-2">Select a conversation or start a new chat</p>
        </div>
      </div>
    );
  }

  const otherParticipant = currentChat.participants.find(
    (p) => p._id !== userData._id
  );

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-700/30 bg-slate-900/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <img
                src={otherParticipant?.image || "/default-avatar.svg"}
                alt={otherParticipant?.username}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-3 border-slate-900 rounded-full"></span>
            </div>
            <div>
              <h2 className="font-bold text-white text-base sm:text-lg">
                {otherParticipant?.name || otherParticipant?.username}
              </h2>
              <p className="text-xs text-green-400/90 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="p-3 hover:bg-slate-700/50 rounded-xl transition text-slate-400 hover:text-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10">
              <FaPhone className="w-5 h-5" />
            </button>
            <button className="p-3 hover:bg-slate-700/50 rounded-xl transition text-slate-400 hover:text-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10">
              <FaVideo className="w-5 h-5" />
            </button>
            <button className="p-3 hover:bg-slate-700/50 rounded-xl transition text-slate-400 hover:text-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10">
              <FaEllipsisVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-900 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {Object.entries(messageGroups).map(([dateKey, msgs]) => (
          <div key={dateKey}>
            {/* Date Separator */}
            <div className="flex items-center justify-center my-6">
              <div className="flex items-center gap-3 w-full max-w-xs">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600/30 to-transparent"></div>
                <span className="px-3 py-1.5 bg-slate-800/90 backdrop-blur-md rounded-full text-xs font-medium text-slate-400 border border-slate-700/50 shadow-sm">
                  {formatMessageDate(msgs[0].createdAt)}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600/30 to-transparent"></div>
              </div>
            </div>
            
            {/* Messages for this date */}
            {msgs.map((message, index) => {
              const isOwn = message.sender._id === userData._id;
              const showAvatar = !isOwn && (index === 0 || msgs[index - 1].sender._id !== message.sender._id);
              
              return (
                <div
                  key={message._id}
                  className={`flex mb-3 ${isOwn ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} gap-1.5 max-w-[80%] sm:max-w-[70%]`}>
                    {/* Avatar for received messages */}
                    {!isOwn && showAvatar && (
                      <div className="flex items-center gap-2 mb-1">
                        <img
                          src={message.sender.image || "/default-avatar.svg"}
                          alt={message.sender.username}
                          className="w-6 h-6 rounded-full object-cover border border-slate-600"
                        />
                        <span className="text-xs font-medium text-cyan-400/80">
                          {message.sender.name || message.sender.username}
                        </span>
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div
                      className={`group relative px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl shadow-md border transition-all duration-200 ${
                        isOwn
                          ? "bg-gradient-to-br from-cyan-500 via-cyan-500 to-cyan-600 text-white rounded-br-sm border-cyan-400/20 shadow-cyan-500/15 hover:shadow-cyan-500/25"
                          : "bg-gradient-to-br from-slate-700/90 to-slate-750/90 text-slate-100 rounded-bl-sm border-slate-600/30 shadow-slate-900/30 hover:shadow-lg"
                      }`}
                    >
                      {message.messageType === "image" ? (
                        <div className="relative">
                          <img
                            src={message.content}
                            alt="Sent image"
                            className="max-w-full rounded-xl max-h-72 object-cover shadow-sm border border-slate-600/30"
                            onError={(e) => e.target.style.display = "none"}
                          />
                        </div>
                      ) : (
                        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      )}
                      {/* Subtle shine effect for own messages */}
                      {isOwn && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/5 to-white/0 pointer-events-none" />
                      )}
                    </div>
                    
                    {/* Timestamp and Read Status */}
                    <div className={`flex items-center gap-1.5 px-1 text-[10px] ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                      <span className="text-slate-500 font-medium">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isOwn && (
                        <span className={`text-xs ${message.read ? "text-cyan-400" : "text-slate-500"}`}>
                          <FaCheckDouble className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0">
        <MessageInput />
      </div>
    </div>
  );
};

export default ChatWindow;