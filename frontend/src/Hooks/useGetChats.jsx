import { useEffect } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { serverUrl } from "../config.js";
import { setChats, setLoading, setError } from "../redux/chatSlice";
import { useSocket } from "../context/SocketContext";

const useGetChats = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { userData } = useSelector((state) => state.user);
  const { chats } = useSelector((state) => state.chat);

  useEffect(() => {
    if (!userData) return;

    const fetchChats = async () => {
      dispatch(setLoading(true));
      try {
        const res = await axios.get(`${serverUrl}/api/chat`, {
          withCredentials: true,
        });
        dispatch(setChats(res.data));
      } catch (err) {
        console.error("Fetch chats failed:", err);
        dispatch(setError("Failed to load chats"));
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchChats();
  }, [userData, dispatch]);

  // Real-time update when new message arrives
  useEffect(() => {
    if (!socket || !userData) return;

    const handleNewMessage = (message) => {
      // Update the chat's last message and timestamp
      dispatch(setChats((prevChats) => {
        return prevChats.map((chat) => {
          const isParticipant = chat.participants.some(
            (p) => p._id === message.sender || p._id === message.receiver
          );
          if (isParticipant) {
            return {
              ...chat,
              lastMessage: {
                content: message.content,
                createdAt: message.createdAt,
              },
              updatedAt: message.createdAt,
            };
          }
          return chat;
        });
      }));
    };

    socket.on("receive_message", handleNewMessage);

    return () => {
      socket.off("receive_message", handleNewMessage);
    };
  }, [socket, userData, dispatch]);

  return chats;
};

export default useGetChats;