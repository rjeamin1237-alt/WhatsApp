/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize local database path
const DB_PATH = path.join(process.cwd(), "db.json");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper to interact with the database
interface DatabaseSchema {
  users: any[];
  chats: any[];
  messages: any[];
  calls: any[];
}

function getDB(): DatabaseSchema {
  if (!fs.existsSync(DB_PATH)) {
    const fresh: DatabaseSchema = {
      users: [
        {
          id: "gemini-bot",
          name: "Meta AI",
          email: "gemini@ai.assistant",
          chatId: "0000000000",
          avatarUrl: "",
          status: "Search, analyze, generate directly here!",
          isOnline: true,
          isBot: true,
        },
      ],
      chats: [],
      messages: [],
      calls: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2), "utf8");
    return fresh;
  }
  try {
    const text = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(text);
  } catch (e) {
    console.error("Database reading error, resetting.", e);
    return { users: [], chats: [], messages: [], calls: [] };
  }
}

function saveDB(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to write to database", e);
  }
}

// Serve any uploaded files statically
app.use("/uploads", express.static(UPLOADS_DIR));

// Create a static fallback for public folder too
const PUBLIC_DIR = path.join(process.cwd(), "public");
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}
app.use(express.static(PUBLIC_DIR));

// ---------------------------------------------------------
// LAZY-INITIALIZED GEMINI CLIENT
// ---------------------------------------------------------
let genAIClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY is not defined in the environment. AI Bot responses will be mocked.");
    }
    genAIClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

// ---------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------

// Register
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const dbData = getDB();
  const lowerEmail = email.toLowerCase();
  const exists = dbData.users.find((u) => u.email.toLowerCase() === lowerEmail);
  if (exists) {
    return res.status(400).json({ error: "Email is already registered" });
  }

  // Generate a random unique 10-digit number as ChatWave/WhatsApp ID
  let chatId = "";
  let idRepeats = true;
  while (idRepeats) {
    chatId = String(Math.floor(1000000000 + Math.random() * 9000000000));
    idRepeats = dbData.users.some((u) => u.chatId === chatId);
  }

  const newUser = {
    id: "user_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    name,
    email,
    password, // Storing simply for simulation
    chatId,
    status: "Hey there! I am using WhatsApp.",
    isOnline: true,
    lastSeen: new Date().toISOString(),
  };

  dbData.users.push(newUser);
  saveDB(dbData);

  // Exclude password in response
  const { password: _, ...cleanUser } = newUser;
  res.json({ user: cleanUser });
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const dbData = getDB();
  const user = dbData.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  // Update status to online
  user.isOnline = true;
  user.lastSeen = new Date().toISOString();
  saveDB(dbData);

  const { password: _, ...cleanUser } = user;
  res.json({ user: cleanUser });
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  const { userId } = req.body;
  if (userId) {
    const dbData = getDB();
    const user = dbData.users.find((u) => u.id === userId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date().toISOString();
      saveDB(dbData);
    }
  }
  res.json({ success: true });
});

// Get/Update profile
app.get("/api/users/:id", (req, res) => {
  const dbData = getDB();
  const user = dbData.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  const { password: _, ...cleanUser } = user;
  res.json({ user: cleanUser });
});

app.post("/api/users/update", (req, res) => {
  const { userId, name, status, avatarUrl } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const dbData = getDB();
  const user = dbData.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (name !== undefined) user.name = name;
  if (status !== undefined) user.status = status;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

  saveDB(dbData);
  const { password: _, ...cleanUser } = user;
  res.json({ user: cleanUser });
});

// Search users by ChatId or Email
app.get("/api/users/search/:query", (req, res) => {
  const q = req.params.query.trim().toLowerCase();
  const dbData = getDB();

  // Find exact email or WhatsApp/ChatID
  const list = dbData.users.filter(
    (u) =>
      !u.isBot &&
      (u.chatId === q || u.email.toLowerCase() === q || u.name.toLowerCase().includes(q))
  );

  res.json({
    users: list.map((u) => {
      const { password: _, ...clean } = u;
      return clean;
    }),
  });
});

// Get single room details between two users or fetch list of chat list for userId
app.get("/api/chats/user/:userId", (req, res) => {
  const { userId } = req.params;
  const dbData = getDB();

  // Find chats where participants contain userId
  const rooms = dbData.chats.filter((c) => c.participants.includes(userId));
  res.json({ chats: rooms });
});

// Create/Open chat room
app.post("/api/chats/create", (req, res) => {
  const { senderId, targetId } = req.body;
  if (!senderId || !targetId) {
    return res.status(400).json({ error: "Participants IDs are required" });
  }

  const dbData = getDB();
  // Check if target user exists
  const target = dbData.users.find((u) => u.id === targetId);
  if (!target) {
    return res.status(404).json({ error: "Recipient user not found" });
  }

  // Check if chat room already exists
  let chat = dbData.chats.find(
    (c) => c.participants.includes(senderId) && c.participants.includes(targetId)
  );

  if (!chat) {
    chat = {
      id: "chat_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      participants: [senderId, targetId],
      lastMessage: "",
      lastMessageTime: new Date().toISOString(),
      unreadCount: {
        [senderId]: 0,
        [targetId]: 0,
      },
    };
    dbData.chats.push(chat);
    saveDB(dbData);
  }

  res.json({ chat });
});

// Get messages for a chat room
app.get("/api/chats/:chatId/messages", (req, res) => {
  const { chatId } = req.params;
  const dbData = getDB();

  // Filter messages belonging to this chat between the participants
  const chat = dbData.chats.find((c) => c.id === chatId);
  if (!chat) {
    return res.json({ messages: [] });
  }

  const msgs = dbData.messages.filter((m) => {
    return (
      (m.senderId === chat.participants[0] && m.receiverId === chat.participants[1]) ||
      (m.senderId === chat.participants[1] && m.receiverId === chat.participants[0])
    );
  });

  res.json({ messages: msgs });
});

// Direct Image / Audio upload endpoint
app.post("/api/upload", (req, res) => {
  const { fileName, fileType, fileData } = req.body; // fileData is base64
  if (!fileName || !fileType || !fileData) {
    return res.status(400).json({ error: "fileName, fileType and fileData are required" });
  }

  try {
    const cleanBase64 = fileData.replace(/^data:.*?;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const uniqueName = Date.now() + "_" + fileName;
    const savePath = path.join(UPLOADS_DIR, uniqueName);

    fs.writeFileSync(savePath, buffer);
    const downloadUrl = `/uploads/${uniqueName}`;

    res.json({ url: downloadUrl, name: fileName, type: fileType });
  } catch (error: any) {
    console.error("Upload error", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// Send message
app.post("/api/messages/send", async (req, res) => {
  const { senderId, receiverId, text, attachment } = req.body;
  if (!senderId || !receiverId) {
    return res.status(400).json({ error: "Sender and Receiver are required" });
  }

  const dbData = getDB();
  const sender = dbData.users.find((u) => u.id === senderId);
  const receiver = dbData.users.find((u) => u.id === receiverId);

  if (!sender || !receiver) {
    return res.status(404).json({ error: "Users not found" });
  }

  // Create message
  const newMessage = {
    id: "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    senderId,
    senderName: sender.name,
    receiverId,
    text: text || "",
    timestamp: new Date().toISOString(),
    isRead: false,
    attachment: attachment || null,
  };

  dbData.messages.push(newMessage);

  // Update or create chat summary
  let chat = dbData.chats.find(
    (c) => c.participants.includes(senderId) && c.participants.includes(receiverId)
  );

  if (!chat) {
    chat = {
      id: "chat_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      participants: [senderId, receiverId],
      lastMessage: text || (attachment ? `[${attachment.type}]` : ""),
      lastMessageTime: new Date().toISOString(),
      unreadCount: {
        [senderId]: 0,
        [receiverId]: 1,
      },
    };
    dbData.chats.push(chat);
  } else {
    chat.lastMessage = text || (attachment ? `[${attachment.type}]` : "");
    chat.lastMessageTime = new Date().toISOString();
    if (!chat.unreadCount) chat.unreadCount = {};
    chat.unreadCount[receiverId] = (chat.unreadCount[receiverId] || 0) + 1;
  }

  saveDB(dbData);

  res.json({ message: newMessage });

  // ---------------------------------------------------------
  // HANDLE AI CHATBOT DIRECT RESPONSES ASYNC
  // ---------------------------------------------------------
  if (receiver.isBot) {
    try {
      let botResponseText = "";
      if (process.env.GEMINI_API_KEY) {
        const client = getGeminiClient();
        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: text,
          config: {
            systemInstruction:
              "You are the Meta AI WhatsApp assistant in a messenger application. Respond concisely, helpfully, like an expert friend in WhatsApp. Feel free to explain, answer questions in English or Bengali depending on the user's input.",
          },
        });
        botResponseText = response.text || "I was unable to understand that message.";
      } else {
        // Fallback mock responses when API KEY is not set
        const lowerText = text.toLowerCase();
        if (lowerText.includes("hello") || lowerText.includes("হাই") || lowerText.includes("সালাম")) {
          botResponseText = "হ্যালো! হোয়াটসঅ্যাপ এআই অ্যাসিস্ট্যান্ট-এ আপনাকে স্বাগতম। আমি আপনার সব প্রশ্নের চটজলদি উত্তর দিতে পারি। বাংলা বা ইংরেজিতে প্রশ্ন করতে পারেন!";
        } else if (lowerText.includes("কেমন আছ") || lowerText.includes("how are you")) {
          botResponseText = "আমি খুবই ভালো আছি! আশা করি আপনার দিনটি চমৎকার কাটছে। আজ আপনাকে কীভাবে সাহায্য করতে পারি?";
        } else {
          botResponseText = `আপনি লিখেছেন: "${text}". এই ডেমো মেসেঞ্জারটি চমৎকারভাবে ডিজাইন করা হয়েছে! জেমিনি এপিআই কি (GEMINI_API_KEY) সেট করা হলে এটি যেকোনো প্রশ্নের সঠিক ও সম্পূর্ণ উত্তর দিতে পারে।`;
        }
      }

      // Add bot's reply back to the database
      const dbDataPost = getDB();
      const botMessage = {
        id: "msg_" + Date.now() + "_bot",
        senderId: receiverId,
        senderName: receiver.name,
        receiverId: senderId,
        text: botResponseText,
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      
      dbDataPost.messages.push(botMessage);

      // Update chat
      const chatPost = dbDataPost.chats.find(
        (c) => c.participants.includes(senderId) && c.participants.includes(receiverId)
      );
      if (chatPost) {
        chatPost.lastMessage = botResponseText;
        chatPost.lastMessageTime = new Date().toISOString();
        if (!chatPost.unreadCount) chatPost.unreadCount = {};
        chatPost.unreadCount[senderId] = (chatPost.unreadCount[senderId] || 0) + 1;
      }
      saveDB(dbDataPost);
    } catch (aiErr) {
      console.error("AI Assistant response failure:", aiErr);
    }
  }
});

// Clear unread messages count
app.post("/api/chats/read", (req, res) => {
  const { chatId, userId } = req.body;
  if (!chatId || !userId) {
    return res.status(400).json({ error: "chatId and userId are required" });
  }

  const dbData = getDB();
  const chat = dbData.chats.find((c) => c.id === chatId);
  if (chat) {
    if (!chat.unreadCount) chat.unreadCount = {};
    chat.unreadCount[userId] = 0;
    saveDB(dbData);
  }
  res.json({ success: true });
});

// Simulated calls endpoints
app.post("/api/calls/initiate", (req, res) => {
  const { callerId, receiverId, type } = req.body;
  if (!callerId || !receiverId || !type) {
    return res.status(400).json({ error: "callerId, receiverId and type are required" });
  }

  const dbData = getDB();
  const newCall = {
    id: "call_" + Date.now(),
    callerId,
    receiverId,
    type,
    status: "ringing",
    timestamp: new Date().toISOString(),
  };

  dbData.calls.push(newCall);
  saveDB(dbData);
  res.json({ call: newCall });
});

app.post("/api/calls/respond", (req, res) => {
  const { callId, status } = req.body; // status: 'accepted' or 'declined' or 'ended'
  if (!callId || !status) {
    return res.status(400).json({ error: "callId and status are required" });
  }

  const dbData = getDB();
  const call = dbData.calls.find((c) => c.id === callId);
  if (!call) {
    return res.status(404).json({ error: "Call session not found" });
  }

  call.status = status;
  saveDB(dbData);
  res.json({ call });
});

app.get("/api/calls/pending/:userId", (req, res) => {
  const { userId } = req.params;
  const dbData = getDB();
  // Find calls for this user that are still at 'ringing' status
  const ringing = dbData.calls.find((c) => c.receiverId === userId && c.status === "ringing");
  res.json({ call: ringing || null });
});

app.get("/api/calls/status/:callId", (req, res) => {
  const dbData = getDB();
  const call = dbData.calls.find((c) => c.id === req.params.callId);
  res.json({ call: call || null });
});


// ---------------------------------------------------------
// DEV SERVER & PRODUCTION MIDDLEWARE IN EXPRESS
// ---------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
