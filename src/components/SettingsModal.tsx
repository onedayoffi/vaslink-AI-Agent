import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Shield, Cpu, Key, Info, Settings, Save, Loader2, Users, CheckCircle, Clock, LogOut, User } from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { cn } from "../lib/utils";

interface UserData {
  uid: string;
  email: string;
  role: 'admin' | 'user';
  isVerified: boolean;
  status: 'Uji Coba' | 'Pro';
  deviceId?: string;
  createdAt?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  allUsers: UserData[];
  onVerifyUser: (uid: string, status: 'Pro' | 'Uji Coba') => Promise<void>;
  onLogout: () => void;
  currentUserEmail?: string | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  isAdmin, 
  allUsers, 
  onVerifyUser, 
  onLogout,
  currentUserEmail
}) => {
  const [geminiKey, setGeminiKey] = useState("");
  const [deepseekKey, setDeepseekKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const docRef = doc(db, "settings", "api_keys");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGeminiKey(data.geminiApiKey || "");
        setDeepseekKey(data.deepseekApiKey || "");
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(db, "settings", "api_keys"), {
        geminiApiKey: geminiKey,
        deepseekApiKey: deepseekKey,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (err) {
      console.error("Error saving settings:", err);
      setMessage({ type: 'error', text: 'Failed to save settings. Check console.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="text-emerald-500" size={20} />
                <h2 className="text-lg font-bold text-white">Vaslink Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="animate-spin text-emerald-500" size={32} />
                  <span className="text-zinc-500 text-sm">Loading settings...</span>
                </div>
              ) : (
                <>
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                      <User size={14} />
                      <span>Account Profile</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-emerald-500 font-bold border border-zinc-700">
                          {currentUserEmail?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-zinc-200">{currentUserEmail}</span>
                          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">
                            {isAdmin ? 'Administrator' : 'Vaslink User'}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          onLogout();
                          onClose();
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all"
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </section>

                  {isAdmin && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                        <Users size={14} />
                        <span>User Management</span>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent pr-2">
                        {allUsers.filter(u => u.email !== currentUserEmail).length === 0 ? (
                          <div className="p-8 text-center rounded-2xl bg-zinc-950/30 border border-zinc-800/50">
                            <p className="text-xs text-zinc-600 italic">No other users registered yet</p>
                          </div>
                        ) : (
                          allUsers.filter(u => u.email !== currentUserEmail).map((u) => (
                            <div key={u.uid} className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800 flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm font-medium text-zinc-300 truncate max-w-[180px]">{u.email}</span>
                                  <span className="text-[9px] text-zinc-500 font-mono">{u.uid.slice(0, 8)}...</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {u.isVerified ? (
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 uppercase bg-emerald-500/10 px-2 py-1 rounded-full">
                                      <CheckCircle size={10} />
                                      Verified
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-yellow-500 uppercase bg-yellow-500/10 px-2 py-1 rounded-full">
                                      <Clock size={10} />
                                      Pending
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => onVerifyUser(u.uid, 'Pro')}
                                  className={cn(
                                    "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border",
                                    u.status === 'Pro' 
                                      ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20" 
                                      : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-500"
                                  )}
                                >
                                  Pro Access
                                </button>
                                <button 
                                  onClick={() => onVerifyUser(u.uid, 'Uji Coba')}
                                  className={cn(
                                    "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border",
                                    u.status === 'Uji Coba' || !u.status
                                      ? "bg-zinc-700 border-zinc-600 text-white" 
                                      : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-500"
                                  )}
                                >
                                  Trial Access
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  )}

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                      <Cpu size={14} />
                      <span>AI Engine</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-2">
                        <span className="text-emerald-400 font-bold text-sm">Gemini 3.1 Pro</span>
                        <span className="text-[10px] text-emerald-500/70 uppercase font-bold tracking-tighter">Active</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700 flex flex-col gap-2 opacity-50">
                        <span className="text-zinc-400 font-bold text-sm">DeepSeek</span>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Coming Soon</span>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                      <Shield size={14} />
                      <span>Security & Keys</span>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Gemini API Key</label>
                          {isAdmin && (
                            <span className="text-[10px] text-emerald-500 font-bold uppercase">Admin Only</span>
                          )}
                        </div>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                          <input
                            type="password"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            disabled={!isAdmin}
                            placeholder={isAdmin ? "Enter Gemini API Key..." : "Configured by Admin"}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">DeepSeek API Key</label>
                          {isAdmin && (
                            <span className="text-[10px] text-emerald-500 font-bold uppercase">Admin Only</span>
                          )}
                        </div>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                          <input
                            type="password"
                            value={deepseekKey}
                            onChange={(e) => setDeepseekKey(e.target.value)}
                            disabled={!isAdmin}
                            placeholder={isAdmin ? "Enter DeepSeek API Key..." : "Configured by Admin"}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800 flex gap-3">
                    <Info size={18} className="text-emerald-500 shrink-0" />
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      {isAdmin 
                        ? "As an admin, you can manually update API keys. These will be stored in Firestore and used if environment variables are missing."
                        : "API keys are managed by administrators. If the app is not working, please contact your administrator."}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 bg-zinc-950/50 border-t border-zinc-800 flex justify-between items-center shrink-0">
              <div className="flex flex-col">
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                  Vaslink v1.0.0
                </div>
                {message && (
                  <div className={cn(
                    "text-[10px] font-bold mt-1",
                    message.type === 'success' ? "text-emerald-500" : "text-red-500"
                  )}>
                    {message.text}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    <span>Save Changes</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm hover:bg-zinc-700 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
