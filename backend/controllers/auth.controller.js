import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import genToken from "../config/token.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  maxAge: 3 * 24 * 60 * 60 * 1000,
};

const cleanUser = (user) => {
  const userObject = user.toObject();
  delete userObject.password;
  return userObject;
};

// ================= SIGN UP =================
export const signUp = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const userByUsername = await User.findOne({ username });
    if (userByUsername) {
      return res.status(400).json({ Message: "Username already exists" });
    }

    const userByEmail = await User.findOne({ email });
    if (userByEmail) {
      return res.status(400).json({ Message: "Email already exists" });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ Message: "Password must be at least 6 characters." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = genToken(user._id);
    res.cookie("BlinkUpZToken", token, cookieOptions);

    return res.status(201).json(cleanUser(user));
  } catch (error) {
    console.error("signUp error:", error);
    return res.status(500).json({ Message: "Sign up failed" });
  }
};

// ================= LOGIN =================
export const logIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ Message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ Message: "Invalid credentials" });
    }

    const token = genToken(user._id);
    res.cookie("BlinkUpZToken", token, cookieOptions);

    return res.status(200).json(cleanUser(user));
  } catch (error) {
    console.error("logIn error:", error);
    return res.status(500).json({ Message: "Login failed" });
  }
};

// ================= LOGOUT =================
export const logOut = async (req, res) => {
  try {
    res.clearCookie("BlinkUpZToken", cookieOptions);
    return res.status(200).json({ Message: "Logout successful" });
  } catch (error) {
    console.error("logOut error:", error);
    return res.status(500).json({ Message: "Logout failed" });
  }
};
