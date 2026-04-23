import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, default: "" },
    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline"
    }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;
