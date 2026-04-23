import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { serverUrl } from '../config.js';
import { setOnlineUsers, setAllOnlineUsers } from '../redux/userSlice.js';
import { showLocalNotification } from '../utils/notifications.js';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const userData = useSelector((state) => state.user?.userData);
  const dispatch = useDispatch();

  useEffect(() => {
    if (userData) {
      const newSocket = io(serverUrl, {
        withCredentials: true,
      });
      setSocket(newSocket);

      // Tell server user is online
      newSocket.on('connect', () => {
        newSocket.emit('go_online', userData._id);
        newSocket.emit('get_online_users', (onlineUserIds) => {
          const onlineMap = {};
          onlineUserIds.forEach((id) => {
            onlineMap[id] = 'online';
          });
          dispatch(setAllOnlineUsers(onlineMap));
        });
      });

      // Listen for online users
      newSocket.on('user_online', (userId) => {
        dispatch(setOnlineUsers({ userId, status: 'online' }));
      });

      newSocket.on('user_offline', (userId) => {
        dispatch(setOnlineUsers({ userId, status: 'offline' }));
      });

      // Handle new message notification
      newSocket.on('new_message_notification', (data) => {
        const { message, chatId } = data;
        // Show local notification if not in the current chat
        const currentChatId = window.location.pathname.split('/').pop();
        if (currentChatId !== chatId) {
          const senderName = message.sender?.name || message.sender?.username || 'Someone';
          showLocalNotification(
            senderName,
            message.messageType === 'image' ? 'Sent an image' : message.content,
            '/logo.png',
            () => window.location.href = `/home?chat=${chatId}`
          );
        }
      });

      return () => {
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [userData]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};