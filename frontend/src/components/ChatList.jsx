import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setCurrentChat } from "../redux/chatSlice";
import useGetChats from "../Hooks/useGetChats";
import UserList from "./UserList";
import api from '../api.js'
import { FaPlus, FaComments } from "react-icons/fa6";

// Format time to show relative or absolute time
const formatMessageTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const ChatList = () => {
  const dispatch = useDispatch();
  const chats = useGetChats();
  const { currentChat } = useSelector((state) => state.chat);
  const { userData, onlineUsers } = useSelector((state) => state.user);
  const [showUserList, setShowUserList] = useState(false);

  const handleChatClick = (chat) => {
    dispatch(setCurrentChat(chat));
  };

  const handleSelectUser = async (user) => {
    try {
      const res = await api.post(
        '/api/chat',
        { participantId: user._id }
      );
      dispatch(setCurrentChat(res.data));
    } catch (error) {
      console.error("Create chat failed:", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header with New Chat Button */}
      <div className="p-3 sm:p-4 border-b border-slate-700/50 relative bg-slate-800/20">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <FaComments className="text-white w-3 h-3 sm:w-4 sm:h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-white">Chats</h2>
          </div>
          <button
            onClick={() => setShowUserList(!showUserList)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition text-xs font-medium shadow-lg shadow-cyan-500/30"
          >
            <FaPlus className="w-3 h-3" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
        {showUserList && (
          <UserList
            onSelectUser={handleSelectUser}
            onClose={() => setShowUserList(false)}
          />
        )}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
              <FaComments className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm font-medium">No chats yet</p>
            <p className="text-slate-500 text-xs mt-1">Start a new conversation!</p>
          </div>
        ) : (
          <div className="p-2">
            {chats.map((chat) => {
              const otherParticipant = chat.participants.find(
                (p) => p._id !== userData._id
              );
              const isActive = currentChat?._id === chat._id;
              const isOnline = onlineUsers[otherParticipant?._id] === 'online';

              return (
                <div
                  key={chat._id}
                  onClick={() => handleChatClick(chat)}
                  className={`p-2 sm:p-3 mx-1 sm:mx-2 my-1 rounded-xl cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? "bg-gradient-to-r from-cyan-500/20 to-transparent border-l-4 border-cyan-500" 
                      : "hover:bg-slate-800/40 border-l-4 border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="relative flex-shrink-0">
                      <img
                        src={otherParticipant?.image || "/default-avatar.svg"}
                        alt={otherParticipant?.username}
                        className="w-10 sm:w-12 h-10 sm:h-12 rounded-full object-cover border-2 border-slate-700 shadow-md"
                      />
                      <span className={`absolute bottom-0 right-0 w-3 sm:w-3.5 h-3 sm:h-3.5 border-2 border-slate-900 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></span>
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-green-400 rounded-full border border-slate-900"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-xs sm:text-sm text-slate-100 truncate">
                          {otherParticipant?.name || otherParticipant?.username}
                        </h3>
                        <span className={`text-[9px] sm:text-[10px] font-medium ${isOnline ? 'text-green-400' : 'text-slate-500'}`}>
                          {isOnline ? 'Online' : formatMessageTime(chat.lastMessage?.createdAt || chat.updatedAt)}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-400 truncate mt-0.5">
                        {chat.lastMessage?.content || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;