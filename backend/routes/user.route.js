import express from "express";
import { getCurrentUser, updateProfile, getAllUsers } from "../controllers/user.controller.js";
import { getPublicVapidKey, subscribePush, unsubscribePush } from "../controllers/notifications.controller.js";
import isAuth from "../middlewares/isAuth.js";
import { upload } from "../middlewares/multer.js";
import User from "../models/user.model.js";

const userRouter = express.Router();

userRouter.get("/current", isAuth, getCurrentUser);
userRouter.get("/all", isAuth, getAllUsers);
userRouter.get("/notifications/public-key", isAuth, getPublicVapidKey);
userRouter.post("/notifications/subscribe", isAuth, subscribePush);
userRouter.post("/notifications/unsubscribe", isAuth, unsubscribePush);
userRouter.post("/profile", isAuth, upload.single("image"), updateProfile);

// Search users
userRouter.get("/search", isAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: "Query required" });

    const users = await User.find({
      $and: [
        { _id: { $ne: req.userId } },
        {
          $or: [
            { username: { $regex: q, $options: "i" } },
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } }
          ]
        }
      ]
    }).select("username name email image status").limit(10);

    res.status(200).json(users);
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ message: "Search failed" });
  }
});

export default userRouter;
