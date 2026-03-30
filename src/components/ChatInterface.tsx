import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { Send, Bot, User, Loader2, Sparkles, Terminal, Settings, History, Plus, Github, MessageSquare, Paperclip, X, FileCode, LogOut, Trash2, Shield, CheckCircle, Clock, Layout, ShoppingCart, UserCircle, Link as LinkIcon, ClipboardList } from "lucide-react";
import { generateCode, Message } from "../services/aiService";
import { CodeBlock } from "./CodeBlock";
import { SettingsModal } from "./SettingsModal";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  doc, 
  setDoc, 
  deleteDoc,
  getDocFromServer,
  getDoc,
  Timestamp
} from "firebase/firestore";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "./AuthProvider";
import { handleFirestoreError, OperationType } from "../lib/firestoreUtils";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UploadedFile {
  name: string;
  content: string;
}

interface Session {
  id: string;
  title: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

interface UserData {
  uid: string;
  email: string;
  role: 'admin' | 'user';
  isVerified: boolean;
  status: 'Uji Coba' | 'Pro';
}

const TEMPLATES = [
  { id: 'store', name: 'Toko Online', icon: ShoppingCart, prompt: 'Buatkan website Toko Online premium dengan desain minimalis seperti Apple atau Stripe. Sertakan copywriting yang persuasif, halaman katalog produk dengan grid yang elegan (2 kolom di mobile), detail produk yang mendalam, dan sistem keranjang belanja yang intuitif. Gunakan animasi hover yang halus, tipografi yang berkelas (line-height normal di mobile), dan spacing yang pas untuk semua layar.' },
  { id: 'portfolio', name: 'Web Portfolio', icon: UserCircle, prompt: 'Buatkan website Portfolio kreatif tingkat tinggi (Dribbble style). Sertakan section Hero dengan copywriting yang kuat, About me yang bercerita, Projects dengan layout bento-grid, dan Contact form yang modern. Gunakan efek glassmorphism dan transisi antar section yang mulus.' },
  { id: 'landing', name: 'Landing Page', icon: Layout, prompt: 'Buatkan Landing Page SaaS kelas dunia. Fokus pada copywriting yang menjual (Problem-Solution-Social Proof). Sertakan pricing table yang clean, FAQ interaktif, dan CTA yang mencolok. Desain harus menggunakan whitespace yang luas dan elemen visual yang tajam.' },
  { id: 'links', name: 'Daftar Link', icon: LinkIcon, prompt: 'Buatkan aplikasi "Link in Bio" premium. Desain harus sangat estetik dengan background gradient mesh, tombol link dengan efek glassmorphism, dan copywriting profil yang menarik. Pastikan sangat responsif dan terasa seperti aplikasi native.' },
  { id: 'order', name: 'Form Pemesanan', icon: ClipboardList, prompt: 'Buatkan form pemesanan layanan jasa eksklusif. Sertakan copywriting yang membangun kepercayaan, validasi input real-time yang elegan, dan sistem kalkulasi biaya otomatis yang transparan. Desain harus terlihat profesional dan terpercaya.' },
];

const SYSTEM_INSTRUCTION = `You are Vaslink, a world-class AI coding agent and UI/UX designer specialized in PHP, MySQL, CSS, HTML, and Javascript. 
Your goal is to provide production-ready, high-end professional code that looks like it was designed by a top agency (Dribbble/Awwwards style).

[DESIGN PHILOSOPHY]
1. PREMIUM AESTHETICS: Use ample whitespace, refined typography, and subtle shadows. Avoid "generic" or "bootstrap-looking" layouts.
2. COMPLETE COPYWRITING: Never use "Lorem Ipsum". Always write compelling, professional, and context-relevant copywriting in Indonesian (unless requested otherwise).
3. INTERACTIVITY: Include smooth CSS transitions, hover effects, and micro-interactions that make the site feel alive.
4. MODERN STACK: Use modern CSS (Flexbox/Grid), semantic HTML5, and clean, modular Javascript/PHP.

[SIGNATURE STYLE & DESIGN SYSTEM]
1. CORE COLORS:
   - Primary/Accent: #ffd700 (Gold/Yellow) - Use for CTA and highlights.
   - Background: #0B0F17 (Deep Navy) for dark mode, or clean #FFFFFF for light mode.
   - Cards: Subtle borders (#2A3450) and deep shadows.
2. TYPOGRAPHY:
   - Use 'Inter' or 'Public Sans' with tight letter-spacing (-0.02em) for headings.
   - Use large, bold headings (clamp() for responsiveness).
3. UI COMPONENTS:
   - Glassmorphism: backdrop-filter: blur(12px) for overlays and navbars.
   - Bento Grids: Use for portfolios and feature sections.
   - Gradients: Use subtle mesh gradients for backgrounds.

[STRUCTURAL RULES]
- Always include a full, responsive navigation bar and footer.
- Ensure all forms have clear validation and success/error states.
- Prioritize security (SQL injection prevention, XSS protection).
- Code must be clean, well-commented, and easy to maintain.

[RESPONSIVE DESIGN RULES]
1. TYPOGRAPHY: On mobile, h1 and h2 must have line-height: 1 or normal. Use clamp() or media queries to reduce font sizes gracefully.
2. PRODUCT CATALOGS: Use a 2-column grid layout on mobile (grid-cols-2) for product listings to maximize visibility.
3. SPACING & RADIUS: Reduce padding, margins, and border-radius on mobile to create a tighter, more native-app feel.
4. MOBILE-FIRST: Always ensure the layout is perfectly functional and aesthetic on small screens.

When asked for code, provide a complete solution. If it's a website, provide the full HTML, CSS, and necessary JS/PHP to make it look and feel like a finished product.`;

export const ChatInterface: React.FC = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle flexible textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // Listen for current user data
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserData;
        // Force admin role in UI if email matches, even if DB is out of sync
        if (user.email === 'admin@vaslink.site' || user.email === 'yanadreamer@gmail.com') {
          data.role = 'admin';
        }
        setUserData(data);
      } else if (user.email === 'admin@vaslink.site' || user.email === 'yanadreamer@gmail.com') {
        // Fallback for admin if doc doesn't exist yet
        setUserData({
          uid: user.uid,
          email: user.email || '',
          role: 'admin',
          isVerified: true,
          status: 'Pro'
        });
      }
    });
    return unsubscribe;
  }, [user]);

  // Listen for all users (if admin)
  useEffect(() => {
    if (userData?.role !== 'admin') return;
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(d => d.data() as UserData);
      setAllUsers(users);
    });
    return unsubscribe;
  }, [userData]);

  // Test connection to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  // Listen for sessions
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "sessions"),
      where("userId", "==", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Session[];
      setSessions(sessionsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "sessions");
    });

    return unsubscribe;
  }, [user]);

  // Listen for messages in current session
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "sessions", currentSessionId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        role: doc.data().role,
        content: doc.data().content
      })) as Message[];
      setMessages(messagesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `sessions/${currentSessionId}/messages`);
    });

    return unsubscribe;
  }, [currentSessionId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setUploadedFiles((prev) => [...prev, { name: file.name, content }]);
      };
      reader.readAsText(file);
    });
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !user) return;

    let sessionId = currentSessionId;
    const userPrompt = input;
    setInput("");
    setIsLoading(true);

    try {
      // Create session if it doesn't exist
      if (!sessionId) {
        try {
          const sessionRef = await addDoc(collection(db, "sessions"), {
            userId: user.uid,
            title: userPrompt.slice(0, 40) + (userPrompt.length > 40 ? "..." : ""),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          sessionId = sessionRef.id;
          setCurrentSessionId(sessionId);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, "sessions");
        }
      } else {
        // Update session timestamp
        try {
          await setDoc(doc(db, "sessions", sessionId), {
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `sessions/${sessionId}`);
        }
      }

      // Add user message to Firestore
      try {
        await addDoc(collection(db, "sessions", sessionId!, "messages"), {
          id: crypto.randomUUID(),
          role: "user",
          content: userPrompt,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `sessions/${sessionId}/messages`);
      }

      let finalInput = userPrompt;
      if (uploadedFiles.length > 0) {
        const fileContext = uploadedFiles
          .map((f) => `--- FILE: ${f.name} ---\n${f.content}`)
          .join("\n\n");
        finalInput = `[CONTEXT FROM UPLOADED FILES]\n${fileContext}\n\n[USER REQUEST]\n${userPrompt}`;
      }

      const response = await generateCode(
        [...messages, { role: "user", content: finalInput }], 
        SYSTEM_INSTRUCTION,
        userData?.status === 'Pro'
      );
      
      // Add assistant message to Firestore
      try {
        await addDoc(collection(db, "sessions", sessionId!, "messages"), {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `sessions/${sessionId}/messages`);
      }

    } catch (error) {
      console.error("Error generating response:", error);
      // We don't save error messages to Firestore usually
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setUploadedFiles([]);
  };

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this session?")) {
      try {
        await deleteDoc(doc(db, "sessions", id));
        if (currentSessionId === id) {
          clearChat();
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `sessions/${id}`);
      }
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const verifyUser = async (uid: string, status: 'Pro' | 'Uji Coba') => {
    try {
      await setDoc(doc(db, "users", uid), {
        isVerified: true,
        status: status
      }, { merge: true });
    } catch (err) {
      console.error("Error verifying user:", err);
    }
  };

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 overflow-hidden">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="h-full bg-zinc-900/50 border-r border-zinc-800/50 flex flex-col overflow-hidden"
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-60 h-24 rounded-lg overflow-hidden flex items-start justify-center">
              <img 
                src="https://vaslink.site/logo-vaslink-code.png" 
                alt="Vaslink Logo" 
                className="w-full h-full object-contain object-top" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>

          <button
            onClick={clearChat}
            className="flex items-center gap-3 w-full p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-all text-sm font-medium mb-6 border border-zinc-700/50"
          >
            <Plus size={18} className="text-emerald-500" />
            <span>New Session</span>
          </button>

          <div className="flex-1 space-y-4 overflow-y-auto scrollbar-none">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-3 mb-2">History</p>
              <div className="space-y-1">
                {sessions.length === 0 ? (
                  <div className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-zinc-800/50 text-zinc-500 text-sm text-left transition-colors cursor-not-allowed">
                    <History size={16} />
                    <span className="truncate">No previous sessions</span>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div 
                      key={session.id}
                      onClick={() => setCurrentSessionId(session.id)}
                      className={cn(
                        "flex items-center justify-between gap-3 w-full p-3 rounded-xl transition-all text-sm text-left group cursor-pointer",
                        currentSessionId === session.id 
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                          : "hover:bg-zinc-800/50 text-zinc-400"
                      )}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <MessageSquare size={16} />
                        <span className="truncate">{session.title}</span>
                      </div>
                      <button 
                        onClick={(e) => deleteSession(e, session.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded transition-all text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-1 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-3 mb-2">Active Files</p>
                <div className="space-y-1">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 w-full p-2 px-3 rounded-lg bg-zinc-800/30 border border-zinc-800 text-[12px] text-zinc-300">
                      <div className="flex items-center gap-2 truncate">
                        <FileCode size={14} className="text-emerald-500 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </div>
                      <button onClick={() => removeFile(idx)} className="text-zinc-500 hover:text-zinc-300">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {userData?.role === 'admin' && (
              <div className="space-y-1 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-3 mb-2">User Management</p>
                <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-none">
                  {allUsers.filter(u => u.uid !== user?.uid).length === 0 ? (
                    <p className="text-[10px] text-zinc-600 px-3 italic">No other users yet</p>
                  ) : (
                    allUsers.filter(u => u.uid !== user?.uid).map((u) => (
                      <div key={u.uid} className="p-2 px-3 rounded-lg bg-zinc-800/30 border border-zinc-800 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-300 truncate font-medium">{u.email}</span>
                          {u.isVerified ? (
                            <CheckCircle size={12} className="text-emerald-500" />
                          ) : (
                            <Clock size={12} className="text-yellow-500" />
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => verifyUser(u.uid, 'Pro')}
                            className={cn(
                              "flex-1 py-1 rounded text-[9px] font-bold uppercase transition-all",
                              u.status === 'Pro' 
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                            )}
                          >
                            Pro
                          </button>
                          <button 
                            onClick={() => verifyUser(u.uid, 'Uji Coba')}
                            className={cn(
                              "flex-1 py-1 rounded text-[9px] font-bold uppercase transition-all",
                              u.status === 'Uji Coba' || !u.status
                                ? "bg-zinc-600 text-white" 
                                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                            )}
                          >
                            Trial
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto pt-6 border-t border-zinc-800/50 space-y-2">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-emerald-500 border border-zinc-700">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                {userData?.isVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-zinc-900">
                    <Shield size={8} className="text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-zinc-300 truncate">{user?.email}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">
                    {userData?.role === 'admin' ? 'Administrator' : 'Vaslink User'}
                  </p>
                  <span className={cn(
                    "text-[8px] px-1 rounded font-bold uppercase",
                    userData?.status === 'Pro' ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-500"
                  )}>
                    {userData?.status || 'Uji Coba'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-zinc-800/50 text-zinc-400 text-sm transition-colors"
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-500/10 text-zinc-400 hover:text-red-400 text-sm transition-colors"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Header */}
        <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 transition-colors"
              >
                <Terminal size={20} />
              </button>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white">
                  Vaslink <span className="text-zinc-500 font-normal ml-2">/ Current Session</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
                <Sparkles size={12} className={cn(userData?.status === 'Pro' ? "text-[#ffd700]" : "text-emerald-500")} />
                <span>{userData?.status === 'Pro' ? 'DeepSeek V3 Pro' : 'Gemini 3.1 Flash'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div className="max-w-3xl mx-auto px-4 py-8 md:px-8 w-full space-y-8">
            {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-55 h-auto flex items-center justify-center overflow-hidden"
              >
                <img 
                  src="https://vaslink.site/logo-vaslink-code.png" 
                  alt="Vaslink Logo" 
                  className="block w-full h-full object-contain" 
                  referrerPolicy="no-referrer" 
                />
              </motion.div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">Apa yang ingin kamu buat hari ini?</h2>
                <p className="text-zinc-400 max-w-md mx-auto">
                  Saya seorang Spesialis PHP, MySQL, CSS, HTML, dan Javascript. Minta saya untuk membuat komponen, men-debug skrip, atau mendesain antarmuka profesional..
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                {[
                  "Build a secure PHP login system with MySQL",
                  "Create a modern CSS grid layout for a dashboard",
                  "Write a Javascript function for real-time validation",
                  "Design a professional landing page with HTML/Tailwind",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all text-left text-sm text-zinc-300 group"
                  >
                    <span className="group-hover:text-emerald-400 transition-colors">{suggestion}</span>
                  </button>
                ))}
              </div>

              <div className="w-full pt-8">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-4">Pilih Template Proyek</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setInput(template.prompt)}
                      className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-[#ffd700]/50 hover:bg-zinc-900 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-[#ffd700] group-hover:bg-[#ffd700]/10 transition-all">
                        <template.icon size={20} />
                      </div>
                      <span className="text-[11px] font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors">{template.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4 p-6 rounded-2xl border transition-all",
                  msg.role === "assistant" 
                    ? "bg-zinc-900/30 border-zinc-800/50" 
                    : "bg-zinc-900/80 border-zinc-700/50 shadow-lg"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                  msg.role === "assistant" 
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                )}>
                  {msg.role === "assistant" ? <Bot size={20} /> : <User size={20} />}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                    {msg.role === "assistant" ? "Vaslink AI" : "You"}
                  </div>
                  <div className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-code:text-emerald-400 prose-headings:text-white prose-strong:text-emerald-400">
                    <ReactMarkdown
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || "");
                          return !inline && match ? (
                            <CodeBlock
                              language={match[1]}
                              value={String(children).replace(/\n$/, "")}
                            />
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0 animate-pulse">
                <Bot size={20} />
              </div>
              <div className="flex items-center gap-3 text-zinc-500 text-sm italic">
                <Loader2 size={16} className="animate-spin text-emerald-500" />
                <span>Vaslink is thinking...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md sticky bottom-0">
        <div className="max-w-3xl mx-auto p-6 w-full">
          <form onSubmit={handleSubmit} className="w-full relative">
            {/* File Preview above input */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[12px] text-zinc-300">
                    <FileCode size={14} className="text-emerald-500" />
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button type="button" onClick={() => removeFile(idx)} className="text-zinc-500 hover:text-zinc-300">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Jelaskan apa yang ingin anda buat / pengeditan kode yang anda berikan..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none min-h-[60px] max-h-40 text-zinc-100 placeholder:text-zinc-600 shadow-inner overflow-y-auto"
                  rows={1}
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    multiple
                    accept=".php,.sql,.html,.css,.js,.ts,.tsx,.jsx,.json,.txt"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
                    title="Upload code files"
                  >
                    <Paperclip size={20} />
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </form>
          <p className="text-center text-[10px] text-zinc-600 mt-4 uppercase tracking-widest">
            Vaslink can make mistakes. Verify important code.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};
