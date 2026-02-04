"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, ArrowLeft, Send, User } from "lucide-react";
import { useAuthStore } from "@/stores/auth";

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl?: string };
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/api/dashboard/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem("token");
      await fetch("http://localhost:3001/api/dashboard/messages", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          receiverId: user?.id === "demo" ? "demo2" : "demo", 
          content: newMessage,
        }),
      });
      setNewMessage("");
      fetchMessages();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-lg border-b border-[#2a2a2a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
              Back
            </Link>
            <div className="w-8 h-8 bg-[#ff4d00] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold">Messages</span>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-[#ff4d00]/30 border-t-[#ff4d00] rounded-full animate-spin mx-auto" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm mt-2">Start a conversation with an agent or human</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, i) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.senderId === user.id ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[70%] rounded-xl p-4 ${
                    message.senderId === user.id 
                      ? "bg-[#ff4d00] text-white" 
                      : "bg-[#1a1a1a] border border-[#2a2a2a]"
                  }`}>
                    <p>{message.content}</p>
                    <p className={`text-xs mt-1 ${message.senderId === user.id ? "text-white/60" : "text-gray-500"}`}>
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      <form 
        onSubmit={sendMessage}
        className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#2a2a2a] p-4"
      >
        <div className="max-w-4xl mx-auto flex gap-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4d00]"
          />
          <button
            type="submit"
            className="bg-[#ff4d00] hover:bg-[#cc3d00] px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
