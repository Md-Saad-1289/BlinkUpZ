import mongoose from "mongoose";

const connectDB = async () => {
    if (!process.env.MONGODB_URL) {
        console.error("MONGODB_URL is not defined in .env");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("✅ MongoDB connected");
    } catch (error) {
        console.error("❌ DB connection failed:", error.message);
        process.exit(1);
    }
};

export default connectDB;
