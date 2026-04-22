import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { serverUrl } from '../config.js';
import { setOnlineUsers } from '../redux/userSlice.js';

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
      });

      // Listen for online users
      newSocket.on('user_online', (userId) => {
        dispatch(setOnlineUsers({ userId, status: 'online' }));
      });

      newSocket.on('user_offline', (userId) => {
        dispatch(setOnlineUsers({ userId, status: 'offline' }));
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