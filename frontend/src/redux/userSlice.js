import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  userData: null,
  onlineUsers: {},
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
    },
    setOnlineUsers: (state, action) => {
      const { userId, status } = action.payload;
      state.onlineUsers[userId] = status;
    },
    setAllOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
  },
});

export const { setUserData, setOnlineUsers, setAllOnlineUsers } = userSlice.actions;
export default userSlice.reducer;
