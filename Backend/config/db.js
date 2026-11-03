import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "node:dns";
import { fileURLToPath } from "node:url";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error(
        "Missing MONGODB_URI in environment variables. Please add it to Backend/.env or Backend/.env.example.",
      );
      process.exit(1);
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    const message = error.message.replace(
      /mongodb(?:\+srv)?:\/\/\S+/gi,
      "[redacted MongoDB URI]",
    );
    console.error(`Error connecting to MongoDB: ${message}`);
    if (/querySrv|queryTxt/i.test(error.message)) {
      console.error(
        "DNS SRV lookup failed. If you are using a mongodb+srv:// URI, your network or DNS resolver may block SRV lookups.",
      );
      console.error(
        "Check your network's DNS access, or try the standard mongodb:// host-list connection string provided by MongoDB Atlas.",
      );
    }
    if (/authentication failed/i.test(error.message)) {
      console.error(
        "Check that the URI uses your Atlas database-user credentials (not your Atlas account login) and URL-encode any special characters in the username or password.",
      );
    }
    process.exit(1);
  }
};

export default connectDB;
