import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Shield, Cpu, Key, Info } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
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
            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
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

            <div className="p-6 space-y-6">
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-800/30 border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Key size={16} className="text-zinc-500" />
                      <span className="text-sm text-zinc-300">Gemini API Key</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md font-bold uppercase tracking-tighter">Configured</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-800/30 border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Key size={16} className="text-zinc-500" />
                      <span className="text-sm text-zinc-300">DeepSeek API Key</span>
                    </div>
                    <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-1 rounded-md font-bold uppercase tracking-tighter">In .env.example</span>
                  </div>
                </div>
              </section>

              <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800 flex gap-3">
                <Info size={18} className="text-emerald-500 shrink-0" />
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Vaslink is designed to be a secure and professional coding assistant. Your API keys are managed via environment variables for maximum security.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-950/50 border-t border-zinc-800 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

import { Settings } from "lucide-react";
