/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  Video,
  Send,
  Check,
  CheckCheck,
  Paperclip,
  Mic,
  Image as ImageIcon,
  Info,
  User as UserIcon,
  ChevronLeft,
  Search,
  Check as CheckIcon,
  LogOut,
  Settings,
  Sun,
  Moon,
  Copy,
  Download,
  Plus,
  Trash2,
  X,
  Languages,
  MicOff,
  VideoOff,
  UserCheck,
  RefreshCw,
  PhoneOff,
  MessageSquare,
  Play,
  Pause,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Message, Chat, Call, Language, TRANSLATIONS, Attachment } from "./types";

export default function App() {
  // Localization & Theme
  const [language, setLanguage] = useState<Language>("bn"); // Default Bengali as requested (বাংলা ইংলিশ দুইটা ল্যাঙ্গুয়েজ লাগবে)
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const t = TRANSLATIONS[language];

  // Auth States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // App Main States
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<{ [id: string]: User }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [newContactQuery, setNewContactQuery] = useState("");
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [keyboardText, setKeyboardText] = useState("");

  // Search in current chat
  const [searchInChat, setSearchInChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");

  // Modals & Panels
  const [profileModal, setProfileModal] = useState<"own" | "peer" | "none">("none");
  const [peerToView, setPeerToView] = useState<User | null>(null);
  const [ownProfileName, setOwnProfileName] = useState("");
  const [ownProfileStatus, setOwnProfileStatus] = useState("");
  const [ownProfileAvatar, setOwnProfileAvatar] = useState("");

  // Media upload & recording states
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);

  // Video/Audio Calling Simulation States
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<string>("");
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [isIncoming, setIsIncoming] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const callTimerRef = useRef<any>(null);

  // App notification banner / feedback
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // WebCam node for video call stream
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Auto scroll reference for messages list
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Poll intervals
  const pollIntervalRef = useRef<any>(null);

  // -------------------------------------------------------------
  // INITIAL LOAD & PERSISTENCE LOAD
  // -------------------------------------------------------------
  useEffect(() => {
    // Check if user is cached in local storage
    const cachedUser = localStorage.getItem("whatsapp_user");
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setCurrentUser(parsed);
        setOwnProfileName(parsed.name);
        setOwnProfileStatus(parsed.status || "Hey there! I am using WhatsApp.");
        setOwnProfileAvatar(parsed.avatarUrl || "");
        fetchMainData(parsed.id);
      } catch (e) {
        console.error("Failed to parse cached user", e);
      }
    }

    // Set theme class on body
    const cachedTheme = localStorage.getItem("whatsapp_theme");
    if (cachedTheme === "dark") {
      setTheme("dark");
    }
  }, []);

  // Update HTML body theme class
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("whatsapp_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("whatsapp_theme", "light");
    }
  }, [theme]);

  // Periodic polling for chats, messages, background processes, and call requests
  useEffect(() => {
    if (!currentUser) return;

    fetchMainData(currentUser.id);

    pollIntervalRef.current = setInterval(() => {
      fetchMainData(currentUser.id);
    }, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [currentUser, selectedChat]);

  // Handle auto scrolling on new message
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Timer for calls
  useEffect(() => {
    if (activeCall && activeCall.status === "accepted") {
      callTimerRef.current = setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setCallSeconds(0);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [activeCall]);

  // Access user webcam for simulated video call
  useEffect(() => {
    if (activeCall && activeCall.type === "video" && !cameraOff) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn("Wont stream camera: ", err);
        });
    } else {
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        localVideoRef.current.srcObject = null;
      }
    }
  }, [activeCall, cameraOff]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Helper notification printer
  const triggerToast = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => {
      setStatusNotification(null);
    }, 3000);
  };

  // -------------------------------------------------------------
  // NETWORK SUITE / API FETCHERS
  // -------------------------------------------------------------
  const fetchMainData = async (userId: string) => {
    try {
      // 1. Fetch Chat rooms
      const chatsRes = await fetch(`/api/chats/user/${userId}`);
      if (!chatsRes.ok) throw new Error("Could not fetch chats");
      const chatsData = await chatsRes.json();
      setChats(chatsData.chats || []);

      // 2. Fetch User profiles dynamically for participants
      const fetchedUsers: { [id: string]: User } = { ...users };
      const uniqueUids = new Set<string>();
      chatsData.chats?.forEach((chat: Chat) => {
        chat.participants.forEach((pId) => {
          if (pId !== userId) uniqueUids.add(pId);
        });
      });

      // Always load the Geminibot
      uniqueUids.add("gemini-bot");

      for (const pId of Array.from(uniqueUids)) {
        if (!fetchedUsers[pId]) {
          const userRes = await fetch(`/api/users/${pId}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            fetchedUsers[pId] = userData.user;
          }
        }
      }
      setUsers(fetchedUsers);

      // 3. Update the actively selected chat messages list
      if (selectedChat) {
        const msgRes = await fetch(`/api/chats/${selectedChat.id}/messages`);
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(msgData.messages || []);
        }

        // Auto mark read
        await fetch("/api/chats/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: selectedChat.id, userId }),
        });
      }

      // 4. Poll incoming Calls
      const callRes = await fetch(`/api/calls/pending/${userId}`);
      if (callRes.ok) {
        const callData = await callRes.json();
        if (callData.call && (!activeCall || activeCall.id !== callData.call.id)) {
          // New incoming call
          setActiveCall(callData.call);
          setCallType(callData.call.type);
          setIsIncoming(true);
          setCallStatus("incoming");
          triggerToast(t.incomingCall);
        }
      }

      // 5. Poll outgoing call status
      if (activeCall && !isIncoming) {
        const callStatusRes = await fetch(`/api/calls/status/${activeCall.id}`);
        if (callStatusRes.ok) {
          const statData = await callStatusRes.json();
          if (statData.call) {
            setActiveCall(statData.call);
            if (statData.call.status === "accepted") {
              setCallStatus("accepted");
            } else if (statData.call.status === "declined") {
              setCallStatus("declined");
              triggerToast(t.callEnded);
              setTimeout(() => {
                setActiveCall(null);
              }, 1500);
            } else if (statData.call.status === "ended") {
              setCallStatus("ended");
              triggerToast(t.callEnded);
              setTimeout(() => {
                setActiveCall(null);
              }, 1500);
            }
          }
        }
      }
    } catch (err) {
      console.error("Polling error: ", err);
    }
  };

  // -------------------------------------------------------------
  // AUTH ROUTINES
  // -------------------------------------------------------------
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    if (!authEmail || !authPassword) {
      setAuthError("All fields are required");
      setAuthLoading(false);
      return;
    }

    try {
      if (authMode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: authEmail, password: authPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthError(data.error || "Login fail");
        } else {
          setCurrentUser(data.user);
          setOwnProfileName(data.user.name);
          setOwnProfileStatus(data.user.status);
          setOwnProfileAvatar(data.user.avatarUrl || "");
          localStorage.setItem("whatsapp_user", JSON.stringify(data.user));
          fetchMainData(data.user.id);
          triggerToast("Successfully Logged In!");
        }
      } else {
        if (!authName) {
          setAuthError("Full Name is required for registration");
          setAuthLoading(false);
          return;
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: authName, email: authEmail, password: authPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthError(data.error || "Register fail");
        } else {
          setCurrentUser(data.user);
          setOwnProfileName(data.user.name);
          setOwnProfileStatus(data.user.status);
          setOwnProfileAvatar(data.user.avatarUrl || "");
          localStorage.setItem("whatsapp_user", JSON.stringify(data.user));
          fetchMainData(data.user.id);
          triggerToast("Account Registered Successfully!");
        }
      }
    } catch (err) {
      setAuthError("Connecting to servers failed. Please verify API status.");
    } finally {
      setAuthLoading(false);
    }
  };

  const logoutUser = async () => {
    if (!currentUser) return;
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });
    } catch (e) {
      console.warn("Signout did not sync: ", e);
    }
    localStorage.removeItem("whatsapp_user");
    setCurrentUser(null);
    setChats([]);
    setSelectedChat(null);
    setMessages([]);
  };

  // -------------------------------------------------------------
  // CONTACTS / RECIPIENTS ADDER
  // -------------------------------------------------------------
  const searchAndStartChat = async () => {
    setContactError("");
    setContactSuccess("");
    if (!newContactQuery.trim()) return;

    try {
      const res = await fetch(`/api/users/search/${newContactQuery.trim()}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();

      if (!data.users || data.users.length === 0) {
        setContactError(t.userNotFound);
        return;
      }

      // Take the first matching user
      const foundUser = data.users[0];
      if (foundUser.id === currentUser?.id) {
        setContactError(t.userNotFound);
        return;
      }

      // Add user to local users dictionary list
      setUsers((prev) => ({ ...prev, [foundUser.id]: foundUser }));

      // Send Request to create Chat
      const chatRes = await fetch("/api/chats/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: currentUser?.id, targetId: foundUser.id }),
      });

      if (!chatRes.ok) throw new Error("Failed to open chat room");
      const chatData = await chatRes.json();

      // Refresh list & select instantly
      setChats((prev) => {
        const exist = prev.some((c) => c.id === chatData.chat.id);
        return exist ? prev : [chatData.chat, ...prev];
      });

      setSelectedChat(chatData.chat);
      setNewContactQuery("");
      setContactSuccess("Chat room successfully launched!");
    } catch (err) {
      setContactError("Error adding new contact: Server Error.");
    }
  };

  const startChatWithGemini = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/chats/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: currentUser.id, targetId: "gemini-bot" }),
      });
      if (res.ok) {
        const data = await res.json();
        // Insert gemini-bot user if missing
        setUsers((prev) => ({
          ...prev,
          "gemini-bot": {
            id: "gemini-bot",
            name: "Meta AI",
            email: "gemini@ai.assistant",
            chatId: "0000000000",
            status: "Search, analyze, generate directly here!",
            isOnline: true,
            isBot: true,
          },
        }));

        setSelectedChat(data.chat);
        triggerToast("Started chat with Meta AI Assistant!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // MESSAGE SENDER & MEDIA HANDLERS
  // -------------------------------------------------------------
  const triggerMessageSend = async (textOver?: string, customAttachment?: Attachment) => {
    const finalTxt = textOver || keyboardText.trim();
    if (!finalTxt && !customAttachment) return;
    if (!currentUser || !selectedChat) return;

    const peerId = selectedChat.participants.find((p) => p !== currentUser.id) || "";
    setKeyboardText("");

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: peerId,
          text: finalTxt,
          attachment: customAttachment || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);

        // Auto Scroll to new message
        setTimeout(() => scrollToBottom(), 100);

        // Fetch to update last message preview immediately
        fetchMainData(currentUser.id);
      }
    } catch (err) {
      triggerToast("Error sending message. Check Server connection.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      triggerMessageSend();
    }
  };

  // Profile image/attachment base64 converter and uploaders
  const uploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    triggerToast("Uploading attachment...");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Content = reader.result as string;

      try {
        let typeVal: "image" | "video" | "voice" | "file" = "file";
        if (file.type.startsWith("image/")) {
          typeVal = "image";
        } else if (file.type.startsWith("video/")) {
          typeVal = "video";
        } else if (file.type.startsWith("audio/")) {
          typeVal = "voice";
        }

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileData: base64Content,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const att: Attachment = {
            type: typeVal,
            url: data.url,
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
          };

          // Send message immediately with the attachment
          await triggerMessageSend(`Shared a file: ${file.name}`, att);
          triggerToast("Successfully sent attachment!");
        } else {
          triggerToast("Failed upload securely.");
        }
      } catch (err) {
        triggerToast("Upload failed due to connection error.");
      } finally {
        setUploadLoading(false);
      }
    };
  };

  // Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          try {
            const res = await fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: `voice_note_${Date.now()}.webm`,
                fileType: "audio/webm",
                fileData: base64Audio,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              const voiceAttach: Attachment = {
                type: "voice",
                url: data.url,
                name: "Voice Note",
              };
              await triggerMessageSend(t.voiceNote, voiceAttach);
              triggerToast("Voice note sent successfully!");
            }
          } catch (err) {
            console.error("Recording save failed:", err);
            triggerToast("Recording save error.");
          }
        };

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      triggerToast("Permission to mic denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  // Format recording timestamp
  const formatTimeStr = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // -------------------------------------------------------------
  // CALLING CORE
  // -------------------------------------------------------------
  const startCall = async (type: "audio" | "video") => {
    if (!currentUser || !selectedChat) return;
    const recipientId = selectedChat.participants.find((p) => p !== currentUser.id) || "";

    try {
      const res = await fetch("/api/calls/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callerId: currentUser.id,
          receiverId: recipientId,
          type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveCall(data.call);
        setCallType(type);
        setCallStatus("calling");
        setIsIncoming(false);
        setMicMuted(false);
        setCameraOff(false);
      }
    } catch (e) {
      triggerToast("Failed initiating call service.");
    }
  };

  const acceptCall = async () => {
    if (!activeCall) return;
    try {
      const res = await fetch("/api/calls/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: activeCall.id,
          status: "accepted",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCall(data.call);
        setCallStatus("accepted");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const declineOrEndCall = async () => {
    if (!activeCall) return;
    try {
      await fetch("/api/calls/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: activeCall.id,
          status: isIncoming && callStatus === "incoming" ? "declined" : "ended",
        }),
      });
      triggerToast(t.callEnded);
      setActiveCall(null);
    } catch (e) {
      setActiveCall(null);
    }
  };

  // -------------------------------------------------------------
  // PROFILE UPDATE SUITE
  // -------------------------------------------------------------
  const saveOwnProfileSettings = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          name: ownProfileName,
          status: ownProfileStatus,
          avatarUrl: ownProfileAvatar,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        localStorage.setItem("whatsapp_user", JSON.stringify(data.user));
        setProfileModal("none");
        triggerToast("Profile successfully saved!");
      }
    } catch (err) {
      triggerToast("Failed to sync profile configuration.");
    }
  };

  const handleProfileImageSelector = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setOwnProfileAvatar(reader.result as string);
    };
  };

  // Copying messages
  const copyMessageToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast(t.copied);
  };

  // Download logic helper
  const triggerAttachmentDownload = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name || "WhatsApp_Media_File";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // RENDER INTERMEDIARIES (CHAT USER INFO)
  // -------------------------------------------------------------
  const getPeerUserOfChat = (chat: Chat): User => {
    const otherId = chat.participants.find((p) => p !== currentUser?.id) || "";
    return (
      users[otherId] || {
        id: otherId,
        name: "User Details Loading",
        email: "",
        chatId: "0000000000",
        status: "",
        isOnline: false,
      }
    );
  };

  // Filter based on search input
  const filteredChats = chats.filter((c) => {
    const peer = getPeerUserOfChat(c);
    const searchLow = searchQuery.toLowerCase();
    return (
      peer.name.toLowerCase().includes(searchLow) ||
      peer.chatId.includes(searchLow) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(searchLow))
    );
  });

  const getActivePeerUser = (): User | null => {
    if (!selectedChat) return null;
    return getPeerUserOfChat(selectedChat);
  };

  const activePeerUser = getActivePeerUser();

  const filteredMessages = messages.filter((m) => {
    if (!chatSearchQuery) return true;
    return m.text.toLowerCase().includes(chatSearchQuery.toLowerCase());
  });

  // Render Time properly customized (অনেক সময় মেসেজের উপরে সময় দেখা যাচ্ছে এগুলো সুন্দরভাবে কাস্টমাইজ করো)
  const formatMessageTime = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    let hrs = d.getHours();
    const mins = d.getMinutes();
    const ampm = hrs >= 12 ? "PM" : "AM";
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12; // hour '0' should be '12'
    const minStr = mins < 10 ? "0" + mins : mins;
    return `${hrs}:${minStr} ${ampm}`;
  };

  const formatMessageDateHeader = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(language === "bn" ? "bn-BD" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // -------------------------------------------------------------
  // VIEW LOGOUT & AUTH CHECKS
  // -------------------------------------------------------------
  if (!currentUser) {
    return (
      <div id="auth-view" className="w-full min-h-screen flex items-center justify-center bg-gray-100 dark:bg-zinc-950 p-4 transition-colors duration-300">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden p-8 flex flex-col items-center">
          
          <div className="w-16 h-16 bg-[#128C7E] flex items-center justify-center rounded-full mb-4">
            <Phone className="text-white w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold font-sans tracking-tight text-gray-900 dark:text-zinc-100 text-center mb-1">
            {authMode === "login" ? t.loginTitle : t.registerTitle}
          </h2>
          <p className="text-sm font-sans text-gray-500 dark:text-zinc-400 text-center mb-6">
            {t.registerSubtitle}
          </p>

          {/* Translation controls */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setLanguage("bn")}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all duration-200 ${
                language === "bn"
                  ? "bg-[#128C7E] text-white border-transparent"
                  : "bg-transparent text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700"
              }`}
            >
              বাংলা
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all duration-200 ${
                language === "en"
                  ? "bg-[#128C7E] text-white border-transparent"
                  : "bg-transparent text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700"
              }`}
            >
              English
            </button>
          </div>

          <form onSubmit={handleAuth} className="w-full space-y-4">
            {authMode === "register" && (
              <div className="w-full flex flex-col gap-1">
                <label className="text-xs font-medium dark:text-zinc-400">{t.fullNameLabel}</label>
                <input
                  type="text"
                  placeholder="E.g., Al-Amin"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border dark:border-zinc-700 px-4 py-3 rounded-lg text-sm text-gray-900 dark:text-zinc-100 font-sans focus:outline-none focus:ring-2 focus:ring-[#128C7E]"
                />
              </div>
            )}

            <div className="w-full flex flex-col gap-1">
              <label className="text-xs font-medium dark:text-zinc-400">{t.emailLabel}</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border dark:border-zinc-700 px-4 py-3 rounded-lg text-sm text-gray-900 dark:text-zinc-100 font-sans focus:outline-none focus:ring-2 focus:ring-[#128C7E]"
              />
            </div>

            <div className="w-full flex flex-col gap-1">
              <label className="text-xs font-medium dark:text-zinc-400">{t.passwordLabel}</label>
              <input
                type="password"
                placeholder="******"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border dark:border-zinc-700 px-4 py-3 rounded-lg text-sm text-gray-900 dark:text-zinc-100 font-sans focus:outline-none focus:ring-2 focus:ring-[#128C7E]"
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#128C7E] hover:bg-[#0d6b60] text-white font-semibold py-3 rounded-lg text-sm transition-colors duration-200 mt-2 flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : authMode === "login" ? (
                t.loginBtn
              ) : (
                t.registerBtn
              )}
            </button>
          </form>

          <button
            onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
            className="text-[#128C7E] hover:underline text-xs font-semibold mt-4"
          >
            {authMode === "login" ? t.toggleToRegister : t.toggleToLogin}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN DASHBOARD LAYOUT
  // -------------------------------------------------------------
  return (
    <div className="w-full h-screen font-sans bg-gray-100 dark:bg-zinc-950 transition-colors duration-300 overflow-hidden flex flex-col relative select-none">
      
      {/* Toast banner notification */}
      <AnimatePresence>
        {statusNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 30 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute left-1/2 -translate-x-1/2 z-[999] bg-zinc-900 text-white rounded-full px-6 py-2 border border-zinc-800 shadow-xl flex items-center gap-3"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
            <span className="text-xs font-sans font-medium">{statusNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full h-full xl:max-w-[1600px] xl:mx-auto xl:my-auto xl:h-[95vh] xl:rounded-xl xl:shadow-2xl overflow-hidden flex bg-white dark:bg-zinc-900">
        
        {/* ========================================== */}
        {/* LEFT SIDEBAR (CHATS LIST)                  */}
        {/* ========================================== */}
        <aside
          className={`w-full md:w-[35%] xl:w-[30%] min-w-[320px] h-full flex flex-col border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-transform duration-300 md:block ${
            selectedChat ? "hidden" : "block"
          }`}
        >
          {/* Header */}
          <div className="h-16 bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-between px-4 border-b border-gray-200 dark:border-zinc-800">
            <div
              onClick={() => {
                setOwnProfileName(currentUser.name);
                setOwnProfileStatus(currentUser.status || "Hey there! I am using WhatsApp.");
                setOwnProfileAvatar(currentUser.avatarUrl || "");
                setProfileModal("own");
              }}
              className="flex items-center gap-3 cursor-pointer"
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full object-cover border border-gray-300 dark:border-zinc-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#128C7E] flex items-center justify-center text-white font-bold text-lg">
                  {currentUser.name[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate max-w-[120px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                  ID: {currentUser.chatId.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language toggle */}
              <button
                onClick={() => setLanguage(language === "en" ? "bn" : "en")}
                title="Toggle Language"
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:bg-gray-250 dark:hover:bg-zinc-800 transition"
              >
                <Languages className="w-5 h-5" />
              </button>

              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                title="Toggle Theme"
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:bg-gray-250 dark:hover:bg-zinc-800 transition"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>

              {/* Meta AI trigger */}
              <button
                onClick={startChatWithGemini}
                title="Ask Meta AI Assistant"
                className="w-8 h-8 rounded-full bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-950 dark:hover:bg-cyan-900 flex items-center justify-center text-cyan-600 dark:text-cyan-400 transition"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              {/* Settings / own profile trigger */}
              <button
                onClick={() => setProfileModal("own")}
                title={t.profile}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-650 dark:text-zinc-300 hover:bg-gray-250 dark:hover:bg-zinc-800 transition"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Logout */}
              <button
                onClick={logoutUser}
                title={t.logout}
                className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-2 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/30">
            <div className="w-full bg-gray-100 dark:bg-zinc-850 rounded-lg px-3 py-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400 block-flex" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-gray-800 dark:text-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          {/* New Contact Search / Conversation Add row */}
          <div className="p-3 border-b border-gray-200 dark:border-zinc-800 flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
              {t.searchUserPrompt}
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ID or Email..."
                value={newContactQuery}
                onChange={(e) => {
                  setNewContactQuery(e.target.value);
                  setContactError("");
                  setContactSuccess("");
                }}
                className="flex-1 bg-gray-50 dark:bg-zinc-800 border dark:border-zinc-705 px-3 py-1.5 rounded-lg text-sm text-gray-900 dark:text-zinc-100 font-sans focus:outline-none"
              />
              <button
                onClick={searchAndStartChat}
                className="bg-[#128C7E] hover:bg-[#0e7468] text-white p-2 rounded-lg transition duration-200 flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {contactError && (
              <span className="text-[11px] text-red-500 font-medium">
                {contactError}
              </span>
            )}
            {contactSuccess && (
              <span className="text-[11px] text-green-500 font-medium">
                {contactSuccess}
              </span>
            )}
          </div>

          {/* Chat List Wrapper */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800">
            {filteredChats.length === 0 ? (
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-xs text-gray-400 dark:text-zinc-500 max-w-[220px]">
                  {t.noChats}
                </p>
                <button
                  onClick={startChatWithGemini}
                  className="text-[#128C7E] text-xs font-semibold hover:underline"
                >
                  Chat with Meta AI (Gemini) Assistant
                </button>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const peer = getPeerUserOfChat(chat);
                const unread = chat.unreadCount?.[currentUser.id] || 0;
                const isSelected = selectedChat?.id === chat.id;

                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setSelectedChat(chat);
                      // Reset unread count locally instantly
                      setChats((prev) =>
                        prev.map((c) =>
                          c.id === chat.id
                            ? { ...c, unreadCount: { ...c.unreadCount, [currentUser.id]: 0 } }
                            : c
                        )
                      );
                    }}
                    className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors duration-200 ${
                      isSelected
                        ? "bg-gray-100 dark:bg-zinc-800"
                        : "hover:bg-gray-50 dark:hover:bg-zinc-850"
                    }`}
                  >
                    {/* Avatar */}
                    {peer.avatarUrl ? (
                      <img
                        src={peer.avatarUrl}
                        alt={peer.name}
                        className="w-12 h-12 rounded-full object-cover border dark:border-zinc-750"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${peer.isBot ? "bg-gradient-to-tr from-cyan-400 to-indigo-600" : "bg-[#128C7E]"}`}>
                        {peer.isBot ? "AI" : peer.name[0].toUpperCase()}
                      </div>
                    )}

                    {/* Meta info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">
                          {peer.isBot ? "Meta AI" : peer.name}
                        </span>
                        {chat.lastMessageTime && (
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                            {new Date(chat.lastMessageTime).toLocaleTimeString(language === "bn" ? "bn-BD" : "en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate max-w-[180px]">
                          {chat.lastMessage || "Start chatting..."}
                        </p>

                        {/* Unreads ticker */}
                        {unread > 0 && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold font-sans text-[10px] flex items-center justify-center shadow-md animate-pulse">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ========================================== */}
        {/* RIGHT CHAT CONTAINER WINDOW                 */}
        {/* ========================================== */}
        <main
          className={`flex-1 h-full flex flex-col relative ${
            selectedChat ? "flex" : "hidden md:flex"
          } bg-zinc-50 dark:bg-zinc-950`}
        >
          {selectedChat && activePeerUser ? (
            <div className="w-full h-full flex flex-col relative relative z-10">
              
              {/* Wallpaper Cover Layer */}
              <div 
                className="absolute inset-0 opacity-[0.04] dark:opacity-[0.02] pointer-events-none bg-repeat" 
                style={{
                  backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/d/df/Shopping_Cart_Icon.svg')",
                  backgroundSize: "130px"
                }}
              />

              {/* Chat Header */}
              <div className="h-16 bg-gray-50 dark:bg-zinc-800/80 backdrop-blur-md flex items-center justify-between px-4 border-b border-gray-200 dark:border-zinc-800 z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full text-gray-600 dark:text-zinc-300 transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div
                    onClick={() => {
                      setPeerToView(activePeerUser);
                      setProfileModal("peer");
                    }}
                    className="flex items-center gap-2 cursor-pointer min-w-0"
                  >
                    {activePeerUser.avatarUrl ? (
                      <img
                        src={activePeerUser.avatarUrl}
                        alt={activePeerUser.name}
                        className="w-10 h-10 rounded-full object-cover border border-gray-300 dark:border-zinc-700 flex-shrink-0"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full font-bold text-white text-md flex items-center justify-center flex-shrink-0 ${activePeerUser.isBot ? "bg-gradient-to-tr from-cyan-400 to-indigo-600" : "bg-[#128C7E]"}`}>
                        {activePeerUser.isBot ? "AI" : activePeerUser.name[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">
                        {activePeerUser.isBot ? "Meta AI" : activePeerUser.name}
                      </span>
                      <span className="text-[11px] text-gray-550 dark:text-zinc-400 truncate max-w-[150px]">
                        {activePeerUser.isBot ? t.aiBotStatus : activePeerUser.isOnline ? t.online : t.offline}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Call & controls (No Emojis allowed based on rules - beautiful Lucide SVGs!) */}
                <div className="flex items-center gap-2">
                  {!activePeerUser.isBot && (
                    <>
                      <button
                        onClick={() => startCall("audio")}
                        title={t.audioCall}
                        className="w-9 h-9 hover:bg-gray-200 dark:hover:bg-zinc-700/80 text-gray-700 dark:text-zinc-250 flex items-center justify-center rounded-full transition"
                      >
                        <Phone className="w-4 h-4 text-[#128C7E]" />
                      </button>
                      <button
                        onClick={() => startCall("video")}
                        title={t.videoCall}
                        className="w-9 h-9 hover:bg-gray-200 dark:hover:bg-zinc-700/80 text-gray-700 dark:text-zinc-250 flex items-center justify-center rounded-full transition"
                      >
                        <Video className="w-4 h-4 text-[#128C7E]" />
                      </button>
                    </>
                  )}

                  {/* Search in chat toggle */}
                  <button
                    onClick={() => {
                      setSearchInChat(!searchInChat);
                      setChatSearchQuery("");
                    }}
                    title="Search Messages"
                    className="w-9 h-9 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-650 dark:text-zinc-300 flex items-center justify-center rounded-full transition"
                  >
                    <Search className="w-4 h-4 text-gray-500" />
                  </button>

                  <button
                    onClick={() => {
                      setPeerToView(activePeerUser);
                      setProfileModal("peer");
                    }}
                    title="View Information"
                    className="w-9 h-9 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-650 dark:text-zinc-300 flex items-center justify-center rounded-full transition"
                  >
                    <Info className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Chat specific search overlay */}
              <AnimatePresence>
                {searchInChat && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-gray-100 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 p-2.5 flex items-center gap-2 z-10"
                  >
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search within message thread..."
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      className="flex-1 bg-white dark:bg-zinc-900 border dark:border-zinc-700 px-3 py-1.5 rounded-lg text-xs text-gray-900 dark:text-zinc-100 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        setSearchInChat(false);
                        setChatSearchQuery("");
                      }}
                      className="text-xs text-gray-500 dark:text-zinc-400 font-semibold hover:underline"
                    >
                      Clear
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message Board Thread */}
              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 relative bg-[#efeae2] dark:bg-zinc-90 w-full">
                
                {/* Meta Greeting details */}
                {filteredMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500 dark:text-zinc-400">
                    <MessageSquare className="w-12 h-12 text-[#128C7E] opacity-50 mb-3" />
                    <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 max-w-xs leading-relaxed">
                      {activePeerUser.isBot ? t.aiDefaultGreeting : "Messages are secured end-to-end. Start typing your message below!"}
                    </p>
                  </div>
                )}

                {/* Print message date headers nicely */}
                {(() => {
                  let lastDateHeader = "";
                  return filteredMessages.map((msg) => {
                    const messageDate = formatMessageDateHeader(msg.timestamp);
                    const showDateHeader = messageDate !== lastDateHeader;
                    if (showDateHeader) {
                      lastDateHeader = messageDate;
                    }

                    const isOut = msg.senderId === currentUser.id;

                    return (
                      <div key={msg.id} className="flex flex-col space-y-2">
                        {showDateHeader && (
                          <div className="w-full flex justify-center my-4">
                            <span className="bg-white/90 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700/60 shadow-sm px-3.5 py-1 text-[11px] font-sans font-medium text-gray-650 dark:text-zinc-300 rounded-lg">
                              {messageDate}
                            </span>
                          </div>
                        )}

                        <div className={`flex w-full mb-1 ${isOut ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`relative max-w-[70%] rounded-2xl px-3.5 py-2.5 pb-5 leading-relaxed text-sm shadow-xl font-sans group ${
                              isOut
                                ? "bg-[#DCF8C6] dark:bg-[#005c4b] text-gray-900 dark:text-zinc-100 rounded-tr-none"
                                : "bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-tl-none"
                            }`}
                          >
                            
                            {/* Message Text content wrapper */}
                            <div className="whitespace-pre-wrap pr-4 text-justify select-text">
                              {msg.text}
                            </div>

                            {/* Render attachments nicely */}
                            {msg.attachment && (
                              <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex flex-col gap-2">
                                {msg.attachment.type === "image" && (
                                  <div className="relative rounded-lg overflow-hidden border dark:border-zinc-700 bg-gray-50 max-h-[180px]">
                                    <img
                                      src={msg.attachment.url}
                                      alt={msg.attachment.name}
                                      className="w-full h-full object-cover max-h-[170px]"
                                    />
                                  </div>
                                )}

                                {msg.attachment.type === "video" && (
                                  <video
                                    src={msg.attachment.url}
                                    controls
                                    className="w-full rounded-lg overflow-hidden border dark:border-zinc-700 max-h-[170px]"
                                  />
                                )}

                                {msg.attachment.type === "voice" && (
                                  <div className="flex items-center gap-2 p-2 bg-black/5 dark:bg-white/5 rounded-lg">
                                    <Mic className="w-5 h-5 text-[#128C7E] flex-shrink-0" />
                                    <audio src={msg.attachment.url} controls className="w-full max-h-[35px]" />
                                  </div>
                                )}

                                {msg.attachment.type === "file" && (
                                  <div className="flex items-center gap-2 p-2 bg-black/5 dark:bg-white/5 rounded-lg border dark:border-zinc-700">
                                    <Paperclip className="w-4 h-4 text-[#128C7E] flex-shrink-0" />
                                    <span className="text-xs truncate max-w-[120px] font-medium">{msg.attachment.name}</span>
                                    {msg.attachment.size && <span className="text-[10px] text-gray-400 font-mono">({msg.attachment.size})</span>}
                                  </div>
                                )}

                                {/* Card sharing/download control buttons */}
                                <div className="flex items-center gap-2.5 mt-1 pt-1 justify-end">
                                  <button
                                    onClick={() => triggerAttachmentDownload(msg.attachment!.url, msg.attachment!.name)}
                                    title={t.download}
                                    className="text-xs font-semibold text-[#128C7E] flex items-center gap-1 hover:underline"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>{t.download}</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Floating Toolbar inside bubble triggered on hover */}
                            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition duration-150 flex gap-1">
                              <button
                                onClick={() => copyMessageToClipboard(msg.text)}
                                title={t.copy}
                                className="p-1 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 rounded text-gray-800 dark:text-zinc-200"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Timestamp tag */}
                            <div className="absolute bottom-1 right-2 flex items-center gap-1.5 text-[9.5px] text-gray-400 dark:text-zinc-400 font-mono">
                              <span>{formatMessageTime(msg.timestamp)}</span>
                              {isOut && (
                                <span>
                                  {msg.isRead ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-cyan-400 shadow-sm" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-gray-400" />
                                  )}
                                </span>
                              )}
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* Virtual pin anchor */}
                <div ref={messagesEndRef} />
              </div>

              {/* Composition Field Composer */}
              <div className="min-h-[64px] bg-gray-50 dark:bg-zinc-800 px-4 py-3 border-t border-gray-200 dark:border-zinc-800 flex items-center gap-3 z-10 shadow-lg">
                
                {/* Upload Action */}
                <input
                  type="file"
                  id="media-uploader-input"
                  ref={fileInputRef}
                  onChange={uploadAttachment}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={uploadLoading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 hover:bg-gray-200 dark:hover:bg-zinc-700 flex items-center justify-center rounded-full text-[#128C7E] hover:text-[#0b544b] transition flex-shrink-0 disabled:opacity-50"
                  title="Attach Media File"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Keyboard Text Area */}
                <div className="flex-1 bg-white dark:bg-zinc-900 rounded-full px-4 py-1.5 border border-gray-200 dark:border-zinc-750/70 flex items-center gap-2">
                  <input
                    type="text"
                    value={keyboardText}
                    onChange={(e) => setKeyboardText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={isRecording ? `${t.recording}...` : t.inputPlaceholder}
                    disabled={isRecording}
                    className="w-full bg-transparent border-none py-1.5 text-sm font-sans focus:outline-none text-gray-900 dark:text-zinc-100 placeholder-gray-400"
                  />
                  
                  {isRecording && (
                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs animate-pulse">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                      <span>{formatTimeStr(recordingTime)}</span>
                    </div>
                  )}
                </div>

                {/* Voice note recorder & Send actions (No Emojis allowed based on guidelines!) */}
                <div className="flex gap-2 flex-shrink-0">
                  
                  {/* Micro recording launcher */}
                  {!activePeerUser.isBot && (
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-11 h-11 flex items-center justify-center rounded-full transition shadow-md ${
                        isRecording
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-650 text-gray-500 dark:text-zinc-300"
                      }`}
                      title="Hold to Record Voice Message"
                    >
                      <Mic className="w-5 h-5 text-[#128C7E]" />
                    </button>
                  )}

                  {/* Sent button */}
                  <button
                    type="button"
                    onClick={() => triggerMessageSend()}
                    disabled={uploadLoading || (!keyboardText.trim() && !isRecording)}
                    className="w-11 h-11 bg-[#128C7E] hover:bg-[#0b544b] text-white flex items-center justify-center rounded-full transition shadow-md disabled:opacity-40"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>

                </div>

              </div>

            </div>
          ) : (
            // Empty placeholder box
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-zinc-50 dark:bg-zinc-900">
              <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <Phone className="w-10 h-10 text-gray-400 group-hover:scale-110 transition" />
              </div>
              <h2 className="text-xl font-sans font-bold text-gray-900 dark:text-zinc-100 mb-1">
                WhatsApp Messenger
              </h2>
              <p className="text-sm font-sans text-gray-500 dark:text-zinc-400 max-w-sm">
                {t.noActiveChat}
              </p>
            </div>
          )}
        </main>

      </div>

      {/* ============================================================= */}
      {/* 1. SECURED USER PROFILE MODAL & VIEWER                          */}
      {/* ============================================================= */}
      <AnimatePresence>
        {profileModal !== "none" && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 relative border border-gray-150 dark:border-zinc-850"
            >
              <button
                onClick={() => setProfileModal("none")}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold font-sans text-gray-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-[#128C7E]" />
                <span>{profileModal === "own" ? t.ownProfileTitle : t.peerProfileTitle}</span>
              </h2>

              {profileModal === "own" ? (
                // Edit Own Profile Configuration
                <div className="space-y-4">
                  
                  {/* Photo picker */}
                  <div className="flex flex-col items-center gap-2 mb-4">
                    <div className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500 bg-gray-100 flex items-center justify-center">
                      {ownProfileAvatar ? (
                        <img
                          src={ownProfileAvatar}
                          alt="Avatar draft"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl font-sans font-bold text-[#128C7E]">
                          {currentUser.name[0].toUpperCase()}
                        </span>
                      )}
                      
                      {/* overlay trigger */}
                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold cursor-pointer transition">
                        Change Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfileImageSelector}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {ownProfileAvatar && (
                      <button
                        onClick={() => setOwnProfileAvatar("")}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">{t.name}</label>
                    <input
                      type="text"
                      value={ownProfileName}
                      onChange={(e) => setOwnProfileName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-zinc-800 border dark:border-zinc-700 px-3.5 py-2.5 rounded-lg text-sm text-gray-900 dark:text-zinc-100 font-sans focus:outline-none focus:ring-1 focus:ring-[#128C7E]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">{t.status}</label>
                    <textarea
                      value={ownProfileStatus}
                      onChange={(e) => setOwnProfileStatus(e.target.value)}
                      rows={2}
                      className="w-full bg-gray-50 dark:bg-zinc-800 border dark:border-zinc-700 px-3.5 py-2.5 rounded-lg text-sm text-gray-900 dark:text-zinc-100 font-sans focus:outline-none focus:ring-1 focus:ring-[#128C7E]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Email Address</label>
                    <span className="text-sm text-gray-600 dark:text-zinc-300 font-mono italic px-1 py-1">
                      {currentUser?.email}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400">{t.chatId}</label>
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-zinc-800 rounded-lg p-3">
                      <span className="text-sm font-bold font-mono text-[#128C7E]">
                        {currentUser?.chatId}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(currentUser.chatId);
                          triggerToast(t.chatIdCopied);
                        }}
                        className="text-xs text-[#128C7E] flex items-center gap-1 font-semibold hover:underline"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t.copy}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setProfileModal("none")}
                      className="flex-1 border dark:border-zinc-700 text-gray-700 dark:text-zinc-300 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
                    >
                      {t.cancel}
                    </button>
                    <button
                      onClick={saveOwnProfileSettings}
                      className="flex-1 bg-[#128C7E] text-white py-2 rounded-lg text-xs font-semibold hover:bg-[#0b544b] transition"
                    >
                      {t.save}
                    </button>
                  </div>
                </div>
              ) : (
                // Peer Profile Viewer
                peerToView && (
                  <div className="space-y-5">
                    
                    {/* Peer avatar */}
                    <div className="flex flex-col items-center gap-2 mb-4">
                      {peerToView.avatarUrl ? (
                        <img
                          src={peerToView.avatarUrl}
                          alt={peerToView.name}
                          className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500"
                        />
                      ) : (
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center font-bold text-white text-3xl ${peerToView.isBot ? "bg-gradient-to-tr from-cyan-400 to-indigo-600" : "bg-[#128C7E]"}`}>
                          {peerToView.isBot ? "AI" : peerToView.name[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 border-b pb-2.5 border-gray-100 dark:border-zinc-800">
                      <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#128C7E]">{t.name}</label>
                      <span className="text-sm font-semibold">{peerToView.isBot ? t.aiBotName : peerToView.name}</span>
                    </div>

                    <div className="flex flex-col gap-1 border-b pb-2.5 border-gray-100 dark:border-zinc-800">
                      <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#128C7E]">{t.about}</label>
                      <span className="text-sm text-gray-700 dark:text-zinc-300 italic">
                        {peerToView.isBot ? t.aiBotStatus : peerToView.status || "Hey there! I am using WhatsApp."}
                      </span>
                    </div>

                    {!peerToView.isBot && (
                      <>
                        <div className="flex flex-col gap-1 border-b pb-2.5 border-gray-100 dark:border-zinc-800">
                          <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#128C7E]">Email Address</label>
                          <span className="text-sm font-mono text-gray-600 dark:text-zinc-300 truncate">
                            {peerToView.email}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#128C7E]">{t.chatId}</label>
                          <div className="flex items-center justify-between bg-gray-50 dark:bg-zinc-800 rounded-lg p-3 mt-1">
                            <span className="text-sm font-bold font-mono text-[#128C7E]">
                              {peerToView.chatId}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(peerToView.chatId);
                                triggerToast(t.chatIdCopied);
                              }}
                              className="text-xs text-[#128C7E] flex items-center gap-1 font-semibold hover:underline"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{t.copy}</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="pt-4 flex justify-center">
                      <button
                        onClick={() => setProfileModal("none")}
                        className="w-full bg-[#128C7E] text-white py-2 rounded-lg text-xs font-semibold hover:bg-[#0b544b] transition"
                      >
                        Close
                      </button>
                    </div>

                  </div>
                )
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================= */}
      {/* 2. VIDEO / AUDIO CALL SIMULATION IN-SCREEN LAYOUT              */}
      {/* ============================================================= */}
      <AnimatePresence>
        {activeCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950 text-white z-[99999] flex flex-col items-center justify-between p-6 select-none"
          >
            {/* Caller peer info */}
            <div className="flex flex-col items-center mt-12 text-center">
              <div className="w-24 h-24 rounded-full bg-[#128C7E] flex items-center justify-center text-white text-3xl font-bold mb-4 border-2 border-white/25 overflow-hidden shadow-2xl animate-pulse">
                {activePeerUser?.avatarUrl ? (
                  <img src={activePeerUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{activePeerUser?.name[0].toUpperCase() || "C"}</span>
                )}
              </div>

              <h2 className="text-xl font-bold font-sans tracking-wide">
                {activePeerUser?.name || "Participant"}
              </h2>

              <p className="text-xs text-gray-400 font-sans tracking-widest uppercase mt-2">
                {callStatus === "calling" && t.calling}
                {callStatus === "ringing" && t.ringing}
                {callStatus === "incoming" && t.incomingCall}
                {callStatus === "accepted" && `${t.connected} • ${formatTimeStr(callSeconds)}`}
              </p>
            </div>

            {/* Video stream box simulation (natively utilizes navigator if available) */}
            {callType === "video" && callStatus === "accepted" && (
              <div className="w-full max-w-sm h-64 bg-zinc-900 border border-zinc-800 rounded-xl relative overflow-hidden flex items-center justify-center my-6 shadow-2xl">
                {!cameraOff ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <VideoOff className="w-12 h-12 text-zinc-700 animate-pulse" />
                )}
                
                {/* Overlay peer representation mockup */}
                <div className="absolute top-3 right-3 w-20 h-24 bg-zinc-850 rounded-lg overflow-hidden border border-zinc-700 shadow-md">
                  <div className="w-full h-full flex items-center justify-center bg-[#128C7E] text-white font-bold text-xs">
                    {activePeerUser?.name[0].toUpperCase()}
                  </div>
                </div>
              </div>
            )}

            {/* Calling answer decline toolbar controls */}
            <div className="w-full max-w-xs flex flex-col gap-4 mb-12">
              {callStatus === "incoming" ? (
                <div className="flex gap-4">
                  <button
                    onClick={declineOrEndCall}
                    className="flex-1 bg-red-600 hover:bg-red-700 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span>{t.reject}</span>
                  </button>
                  <button
                    onClick={acceptCall}
                    className="flex-1 bg-green-600 hover:bg-green-700 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-white"
                  >
                    <Phone className="w-5 h-5 animate-bounce" />
                    <span>{t.accept}</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  
                  {/* Local settings */}
                  {callStatus === "accepted" && (
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={() => setMicMuted(!micMuted)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow ${
                          micMuted ? "bg-red-500 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        <MicOff className="w-5 h-5" />
                      </button>

                      {callType === "video" && (
                        <button
                          onClick={() => setCameraOff(!cameraOff)}
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow ${
                            cameraOff ? "bg-red-500 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                          }`}
                        >
                          <VideoOff className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    onClick={declineOrEndCall}
                    className="w-full bg-red-600 hover:bg-red-700 font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-white"
                  >
                    <PhoneOff className="w-5 h-5 text-white" />
                    <span>Disconnect Call</span>
                  </button>
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
