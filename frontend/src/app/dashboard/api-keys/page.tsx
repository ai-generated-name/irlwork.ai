"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Zap, ArrowLeft, Copy, CheckCircle, Plus, Trash2, 
  Key, Eye, EyeOff, AlertTriangle, X
} from "lucide-react";
import Link from "next/link";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string | null;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch("http://localhost:3002/api/api-keys");
      const data = await res.json();
      if (res.ok) {
        setKeys(data.keys);
      }
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    setCreating(true);
    try {
      const res = await fetch("http://localhost:3002/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Key ${keys.length + 1}` }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewKey(data.key);
        fetchKeys();
      }
    } catch (err) {
      console.error("Failed to create key:", err);
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this key? This action cannot be undone.")) {
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:3002/api/api-keys/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setKeys(keys.filter(k => k.id !== id));
        if (newKey?.id === id) {
          setNewKey(null);
        }
      }
    } catch (err) {
      console.error("Failed to revoke key:", err);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskKey = (key: string) => {
    if (key.length < 10) return key;
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] bg-[#0a0a0a]/90 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#ff4d00] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-display font-bold">irlwork.ai</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl font-bold mb-2">API Keys</h1>
              <p className="text-gray-400">Manage your API keys for agent integration</p>
            </div>
            <button
              onClick={createKey}
              disabled={creating}
              className="bg-[#00ff9d] text-black hover:bg-[#00cc7d] py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create New Key
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-[#00ff9d] flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium mb-1">MCP Integration</div>
                <div className="text-sm text-gray-400">
                  Use these API keys to authenticate your AI agent via the Model Context Protocol (MCP). 
                  Keep your keys secure and never share them publicly.
                </div>
              </div>
            </div>
          </div>

          {/* New Key Display */}
          {newKey && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="font-medium text-green-400">New API Key Created</span>
                </div>
                <button
                  onClick={() => setNewKey(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 flex items-center gap-3">
                <code className="flex-1 font-mono text-sm text-green-400 break-all">
                  {newKey.key}
                </code>
                <button
                  onClick={() => copyKey(newKey.key)}
                  className="text-gray-400 hover:text-white"
                >
                  {copied ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Make sure to copy your key now. You won&apos;t be able to see it again!
              </p>
            </motion.div>
          )}

          {/* Keys List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#ff4d00]/30 border-t-[#ff4d00] rounded-full animate-spin" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
              <Key className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <div className="font-medium mb-2">No API Keys Yet</div>
              <div className="text-sm text-gray-400 mb-4">
                Create your first API key to integrate your AI agent
              </div>
              <button
                onClick={createKey}
                className="bg-[#00ff9d] text-black hover:bg-[#00cc7d] py-2 px-4 rounded-lg font-semibold transition-colors"
              >
                Create First Key
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((apiKey) => (
                <motion.div
                  key={apiKey.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#00ff9d]/10 rounded-lg flex items-center justify-center">
                        <Key className="w-5 h-5 text-[#00ff9d]" />
                      </div>
                      <div>
                        <div className="font-medium">{apiKey.name}</div>
                        <div className="text-sm text-gray-400 font-mono">
                          {showKey === apiKey.id ? apiKey.key : maskKey(apiKey.key)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                        className="text-gray-400 hover:text-white p-2"
                      >
                        {showKey === apiKey.id ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => copyKey(apiKey.key)}
                        className="text-gray-400 hover:text-white p-2"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => revokeKey(apiKey.id)}
                        className="text-red-400 hover:text-red-300 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>Created: {new Date(apiKey.createdAt).toLocaleDateString()}</span>
                    {apiKey.lastUsed && (
                      <span>Last used: {new Date(apiKey.lastUsed).toLocaleDateString()}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Security Warning */}
          <div className="mt-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-400">
                <strong className="text-yellow-500">Security Tip:</strong> Never share your API keys 
                in public repositories, chat messages, or code comments. Rotate your keys immediately 
                if you suspect they have been compromised.
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
