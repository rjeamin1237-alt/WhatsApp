/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  chatId: string; // 10-digit number as string
  avatarUrl?: string; // base64 or placeholder
  status: string;
  isOnline: boolean;
  lastSeen?: string;
  isBot?: boolean;
}

export interface Attachment {
  type: 'image' | 'video' | 'voice' | 'file';
  url: string; // base64 data url or path
  name: string;
  size?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  timestamp: string; // ISO string
  isRead: boolean;
  attachment?: Attachment;
  replyTo?: string; // ID of message replied to
}

export interface Chat {
  id: string;
  participants: string[]; // User IDs
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: { [userId: string]: number };
}

export interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'declined' | 'ended';
  timestamp: string;
}

export type Language = 'en' | 'bn';

export const TRANSLATIONS = {
  en: {
    appName: "WhatsApp",
    aiBotName: "Meta AI (Gemini)",
    aiBotStatus: "Online | AI Assistant",
    aiDefaultGreeting: "Hello! I am your AI assistant powered by Gemini. Ask me anything!",
    searchPlaceholder: "Search or start a new chat",
    inputPlaceholder: "Type a message",
    noChats: "No chats yet. Search for a user or start chatting with Meta AI!",
    searchUserPrompt: "Search by email or ChatWave ID",
    registerTitle: "Welcome to ChatWave",
    registerSubtitle: "Start chatting with friends in real time",
    loginTitle: "Log In",
    emailLabel: "Email Address",
    passwordLabel: "Password",
    fullNameLabel: "Full Name",
    loginBtn: "Log In",
    registerBtn: "Create Account",
    toggleToRegister: "Don't have an account? Sign up",
    toggleToLogin: "Already have an account? Log in",
    logout: "Log Out",
    profile: "Profile",
    viewProfile: "View Profile",
    name: "Name",
    status: "Status",
    chatId: "WhatsApp ID",
    save: "Save",
    cancel: "Cancel",
    offline: "offline",
    online: "online",
    lastSeen: "last seen",
    calling: "Calling...",
    ringing: "Ringing...",
    connected: "Connected",
    callEnded: "Call Ended",
    incomingCall: "Incoming Call",
    accept: "Accept",
    reject: "Decline",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    copy: "Copy",
    copied: "Copied!",
    download: "Download",
    recording: "Recording",
    share: "Share",
    shareSuccess: "Message link copied to share!",
    addContact: "Add Chat",
    userNotFound: "User not found or you searched for yourself.",
    audioCall: "Audio Call",
    videoCall: "Video Call",
    noActiveChat: "Select a chat to start messaging",
    ownProfileTitle: "Your Profile",
    peerProfileTitle: "User Profile",
    about: "About",
    chatIdCopied: "Chat ID copied!",
    unsupportedFile: "Unsupported file format.",
    voiceNote: "Voice Note",
    send: "Send",
    back: "Back",
  },
  bn: {
    appName: "হোয়াটসঅ্যাপ",
    aiBotName: "মেটা এআই (জেমিনি)",
    aiBotStatus: "অনলাইন | এআই অ্যাসিস্ট্যান্ট",
    aiDefaultGreeting: "হ্যালো! আমি জেমিনি দ্বারা চালিত আপনার এআই অ্যাসিস্ট্যান্ট। আমাকে যেকোনো কিছু জিজ্ঞেস করতে পারেন!",
    searchPlaceholder: "মেসেজ খুঁজুন বা নতুন চ্যাট শুরু করুন",
    inputPlaceholder: "মেসেজ লিখুন",
    noChats: "এখনো কোনো চ্যাট নেই। ব্যবহারকারী খুঁজুন বা মেটা এআই এর সাথে চ্যাট শুরু করুন!",
    searchUserPrompt: "ইমেইল বা হোয়াটসঅ্যাপ আইডি দিয়ে খুঁজুন",
    registerTitle: "চ্যাটওয়েভ-এ স্বাগতম",
    registerSubtitle: "বন্ধু-বান্ধবদের সাথে রিয়েল টাইম চ্যাট শুরু করুন",
    loginTitle: "লগইন করুন",
    emailLabel: "ইমেইল অ্যাড্রেস",
    passwordLabel: "পাসওয়ার্ড",
    fullNameLabel: "সম্পূর্ণ নাম",
    loginBtn: "লগইন করুন",
    registerBtn: "অ্যাকাউন্ট তৈরি করুন",
    toggleToRegister: "অ্যাকাউন্ট নেই? সাইন আপ করুন",
    toggleToLogin: "ইতিমধ্যেই অ্যাকাউন্ট আছে? লগইন করুন",
    logout: "লগ আউট",
    profile: "প্রোফাইল",
    viewProfile: "প্রোফাইল দেখুন",
    name: "নাম",
    status: "স্ট্যাটাস",
    chatId: "হোয়াটসঅ্যাপ আইডি",
    save: "সংরক্ষণ করুন",
    cancel: "বাতিল করুন",
    offline: "অফলাইন",
    online: "অনলাইন",
    lastSeen: "সর্বশেষ দেখা",
    calling: "কল হচ্ছে...",
    ringing: "রিং হচ্ছে...",
    connected: "সংযুক্ত",
    callEnded: "কল শেষ",
    incomingCall: "ইনকামিং কল",
    accept: "গ্রহণ করুন",
    reject: "প্রত্যাখ্যান করুন",
    darkMode: "ডার্ক মোড",
    lightMode: "লাইট মোড",
    copy: "কপি",
    copied: "কপি হয়েছে!",
    download: "ডাউনলোড",
    recording: "রেকর্ড হচ্ছে",
    share: "শেয়ার করুন",
    shareSuccess: "মেসেজ শেয়ার লিংক কপি হয়েছে!",
    addContact: "চ্যাট যোগ",
    userNotFound: "ব্যবহারকারী পাওয়া যায়নি বা আপনি নিজের আইডি খুঁজছেন।",
    audioCall: "অডিও কল",
    videoCall: "ভিডিও কল",
    noActiveChat: "মেসেজিং করতে একটি চ্যাট নির্বাচন করুন",
    ownProfileTitle: "আপনার প্রোফাইল",
    peerProfileTitle: "প্রোফাইল বিবরণ",
    about: "তথ্য",
    chatIdCopied: "চ্যাট আইডি কপি করা হয়েছে!",
    unsupportedFile: "অসমর্থিত ফাইল ফরম্যাট।",
    voiceNote: "ভয়েস রেকর্ড",
    send: "পাঠান",
    back: "পিছনে",
  }
};
