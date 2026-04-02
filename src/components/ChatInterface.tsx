import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { Send, Bot, User, Loader2, Sparkles, Terminal, Settings, History, Plus, Github, MessageSquare, Paperclip, X, FileCode, LogOut, Trash2, Shield, CheckCircle, Clock, Layout, ShoppingCart, UserCircle, Link as LinkIcon, ClipboardList, Code, Globe, Edit2 } from "lucide-react";
import { generateCode, generateCodeStream, extractMemory, Message, UserMemory } from "../services/aiService";
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

interface TemplateQuestion {
  id: string;
  label: string;
  type: 'select' | 'text';
  options?: string[];
  placeholder?: string;
  condition?: (answers: Record<string, string>) => boolean;
}

interface Template {
  id: string;
  name: string;
  icon: any;
  prompt: string;
  questions: TemplateQuestion[];
}

interface UserData {
  uid: string;
  email: string;
  role: 'admin' | 'user';
  isVerified: boolean;
  status: 'Uji Coba' | 'Pro';
  deviceId?: string;
  createdAt?: string;
}

const COMMON_QUESTIONS: TemplateQuestion[] = [
  { id: 'font', label: 'Jenis Font?', type: 'select', options: ['Inter (Modern)', 'Public Sans (Clean)', 'Playfair Display (Elegant)', 'Space Grotesk (Tech)', 'JetBrains Mono (Developer)', 'DM Sans (Geometric)', 'DM Serif (Classic)', 'Montserrat (Bold)'] },
  { id: 'responsive', label: 'Optimasi Responsive?', type: 'select', options: ['Ultra Responsive (Lebih tipis & rapat di mobile)', 'Standard Responsive'] },
  { id: 'custom', label: 'Permintaan Khusus (Opsional)', type: 'text', placeholder: 'Misal: Tambahkan animasi scroll, integrasi API, atau fitur spesifik lainnya...' },
];

const TEMPLATES: Template[] = [
  { 
    id: 'website', 
    name: 'Website Bisnis', 
    icon: Globe, 
    prompt: 'Buatkan website profil bisnis profesional tingkat tinggi (Corporate/Agency style). Desain harus sangat modern, bersih, dan menggunakan grid yang presisi. Sertakan section Hero yang impresif, About Us, Services/Products, Portfolio/Gallery, dan Contact. Pastikan copywriting sangat profesional dan relevan dengan industri yang dipilih.',
    questions: [
      { id: 'niche', label: 'Jenis Website Bisnis?', type: 'select', options: ['Ekspor Barang', 'Skincare & Beauty', 'Pertanian', 'Pertambangan', 'Perkebunan', 'Elektronik (Handphone)', 'Elektronik (Komputer)', 'Tempat Wisata', 'Restoran & Cafe'] },
      { id: 'brand_name', label: 'Nama Perusahaan / Brand?', type: 'text', placeholder: 'Masukkan nama bisnis Anda...' },
      
      // Ekspor Barang
      { id: 'ekspor_commodity', label: 'Komoditas Utama?', type: 'select', options: ['Kopi & Teh', 'Rempah-rempah', 'Furniture', 'Tekstil', 'Hasil Laut', 'Lainnya'], condition: (a) => a.niche === 'Ekspor Barang' },
      { id: 'ekspor_target', label: 'Target Negara?', type: 'text', placeholder: 'Misal: Eropa, Amerika, China...', condition: (a) => a.niche === 'Ekspor Barang' },
      
      // Skincare
      { id: 'skincare_focus', label: 'Fokus Produk?', type: 'select', options: ['Anti-Aging', 'Acne Care', 'Whitening', 'Natural/Organic', 'All-in-one'], condition: (a) => a.niche === 'Skincare & Beauty' },
      { id: 'skincare_cert', label: 'Sertifikasi?', type: 'select', options: ['BPOM & Halal', 'BPOM Only', 'Dermatology Tested', 'Sedang Proses'], condition: (a) => a.niche === 'Skincare & Beauty' },
      
      // Pertanian / Perkebunan
      { id: 'agri_type', label: 'Hasil Panen Utama?', type: 'select', options: ['Padi/Beras', 'Sayuran Organik', 'Buah-buahan', 'Kelapa Sawit', 'Karet', 'Kopi'], condition: (a) => a.niche === 'Pertanian' || a.niche === 'Perkebunan' },
      { id: 'agri_method', label: 'Metode Produksi?', type: 'select', options: ['Organik Modern', 'Hidroponik', 'Konvensional Skala Besar', 'Sustainable Farming'], condition: (a) => a.niche === 'Pertanian' || a.niche === 'Perkebunan' },
      
      // Pertambangan
      { id: 'mining_type', label: 'Jenis Mineral/Tambang?', type: 'select', options: ['Batu Bara', 'Nikel', 'Emas', 'Tembaga', 'Pasir Besi'], condition: (a) => a.niche === 'Pertambangan' },
      { id: 'mining_focus', label: 'Fokus Operasi?', type: 'select', options: ['Eksplorasi', 'Produksi & Pengolahan', 'Distribusi/Logistik'], condition: (a) => a.niche === 'Pertambangan' },
      
      // Elektronik
      { id: 'elec_brand', label: 'Brand Utama?', type: 'text', placeholder: 'Misal: Samsung, Apple, Asus, atau Brand Sendiri...', condition: (a) => a.niche?.includes('Elektronik') },
      { id: 'elec_service', label: 'Fokus Utama?', type: 'select', options: ['Penjualan Unit Baru', 'Service & Sparepart', 'Second/Refurbished Premium'], condition: (a) => a.niche?.includes('Elektronik') },
      
      // Wisata
      { id: 'tour_type', label: 'Jenis Wisata?', type: 'select', options: ['Alam & Pegunungan', 'Pantai & Resor', 'Edukasi & Budaya', 'Wahana Permainan'], condition: (a) => a.niche === 'Tempat Wisata' },
      { id: 'tour_facility', label: 'Fasilitas Unggulan?', type: 'text', placeholder: 'Misal: Glamping, Waterpark, Tour Guide...', condition: (a) => a.niche === 'Tempat Wisata' },
      
      // Restoran
      { id: 'resto_cuisine', label: 'Jenis Masakan?', type: 'select', options: ['Indonesian Food', 'Western/Italian', 'Japanese/Korean', 'Coffee & Pastry', 'Seafood'], condition: (a) => a.niche === 'Restoran & Cafe' },
      { id: 'resto_service', label: 'Layanan?', type: 'select', options: ['Dine-in & Reservation', 'Delivery & Takeaway', 'Catering Event'], condition: (a) => a.niche === 'Restoran & Cafe' },

      ...COMMON_QUESTIONS
    ]
  },
  { 
    id: 'store', 
    name: 'Toko Online', 
    icon: ShoppingCart, 
    prompt: 'Buatkan website Toko Online premium dengan desain minimalis seperti Apple atau Stripe. Sertakan copywriting yang persuasif, halaman katalog produk dengan grid yang elegan (2 kolom di mobile), detail produk yang mendalam, dan sistem keranjang belanja yang intuitif. Gunakan animasi hover yang halus, tipografi yang berkelas (line-height normal di mobile), dan spacing yang pas untuk semua layar.',
    questions: [
      { id: 'brand', label: 'Nama Brand / Toko?', type: 'text', placeholder: 'Misal: Vaslink Store, Dreamer Fashion...' },
      { id: 'product', label: 'Produk apa yang ingin dijual?', type: 'select', options: ['Fashion & Apparel', 'Elektronik', 'Makanan & Minuman', 'Produk Digital', 'Furniture', 'Lainnya'] },
      { id: 'style', label: 'Style desain?', type: 'select', options: ['Minimalis (Apple Style)', 'Mewah (Luxury)', 'Modern & Clean (Stripe Style)', 'Playful & Colorful'] },
      { id: 'theme', label: 'Tema warna?', type: 'select', options: ['Dark Mode', 'Light Mode', 'Mixed'] },
      { id: 'features', label: 'Fitur utama?', type: 'select', options: ['WhatsApp Order', 'Shopping Cart', 'Product Reviews', 'Catalog Only'] },
      ...COMMON_QUESTIONS
    ]
  },
  { 
    id: 'portfolio', 
    name: 'Web Portfolio', 
    icon: UserCircle, 
    prompt: 'Buatkan website Portfolio kreatif tingkat tinggi (Dribbble style). Sertakan section Hero dengan copywriting yang kuat, About me yang bercerita, Projects dengan layout bento-grid, dan Contact form yang modern. Gunakan efek glassmorphism dan transisi antar section yang mulus.',
    questions: [
      { id: 'name', label: 'Nama Lengkap Anda?', type: 'text', placeholder: 'Misal: Yana Dreamer, John Doe...' },
      { id: 'niche', label: 'Bidang keahlian?', type: 'select', options: ['UI/UX Designer', 'Web Developer', 'Fotografer', 'Content Creator', 'Arsitek'] },
      { id: 'style', label: 'Style desain?', type: 'select', options: ['Bento Grid (Modern)', 'Minimalist (Clean)', 'Interactive (Motion)', 'Brutalist (Bold)'] },
      { id: 'theme', label: 'Tema warna?', type: 'select', options: ['Dark Mode', 'Light Mode', 'Vibrant Gradient'] },
      ...COMMON_QUESTIONS
    ]
  },
  { 
    id: 'landing', 
    name: 'Landing Page', 
    icon: Layout, 
    prompt: 'Buatkan Landing Page SaaS kelas dunia. Fokus pada copywriting yang menjual (Problem-Solution-Social Proof). Sertakan pricing table yang clean, FAQ interaktif, dan CTA yang mencolok. Desain harus menggunakan whitespace yang luas dan elemen visual yang tajam.',
    questions: [
      { id: 'product_name', label: 'Nama Produk / Layanan?', type: 'text', placeholder: 'Misal: Vaslink AI, CloudSync Pro...' },
      { id: 'type', label: 'Jenis produk/layanan?', type: 'select', options: ['SaaS App', 'Kursus Online', 'Digital Agency', 'Mobile App Landing'] },
      { id: 'focus', label: 'Fokus utama?', type: 'select', options: ['Konversi & Sales', 'Edukasi Produk', 'Lead Generation'] },
      { id: 'theme', label: 'Tema warna?', type: 'select', options: ['Dark Mode', 'Light Mode', 'Corporate Blue'] },
      ...COMMON_QUESTIONS
    ]
  },
  { 
    id: 'links', 
    name: 'Daftar Link', 
    icon: LinkIcon, 
    prompt: 'Buatkan aplikasi "Link in Bio" premium. Desain harus sangat estetik dengan background gradient mesh, tombol link dengan efek glassmorphism, dan copywriting profil yang menarik. Pastikan sangat responsif dan terasa seperti aplikasi native.',
    questions: [
      { id: 'name', label: 'Nama / Username?', type: 'text', placeholder: 'Misal: @yanadreamer, Yana Studio...' },
      { id: 'style', label: 'Style?', type: 'select', options: ['Glassmorphism', 'Neumorphism', 'Minimalist List', 'Card Based'] },
      { id: 'bg', label: 'Background?', type: 'select', options: ['Mesh Gradient', 'Solid Color', 'Abstract Image'] },
      ...COMMON_QUESTIONS
    ]
  },
  { 
    id: 'order', 
    name: 'Form Pemesanan', 
    icon: ClipboardList, 
    prompt: 'Buatkan form pemesanan layanan jasa eksklusif. Sertakan copywriting yang membangun kepercayaan, validasi input real-time yang elegan, dan sistem kalkulasi biaya otomatis yang transparan. Desain harus terlihat profesional dan terpercaya.',
    questions: [
      { id: 'service', label: 'Jenis layanan?', type: 'select', options: ['Jasa Desain/Dev', 'Booking Jadwal', 'Custom Order Produk'] },
      { id: 'style', label: 'Style?', type: 'select', options: ['Clean & Professional', 'Modern Floating', 'Step-by-step Form'] },
      ...COMMON_QUESTIONS
    ]
  },
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
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [templateAnswers, setTemplateAnswers] = useState<Record<string, string>>({});
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [userMemory, setUserMemory] = useState<UserMemory>({});
  const [apiKeys, setApiKeys] = useState<{ geminiApiKey?: string; deepseekApiKey?: string }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

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
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    });
    return unsubscribe;
  }, [user]);

  // Listen for API keys
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "settings", "api_keys"), (doc) => {
      if (doc.exists()) {
        setApiKeys(doc.data());
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "settings/api_keys");
    });
    return unsubscribe;
  }, [user]);

  // Listen for User Memory
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "memories", user.uid), (doc) => {
      if (doc.exists()) {
        setUserMemory(doc.data() as UserMemory);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `memories/${user.uid}`);
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
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "users");
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

  const handleTemplateClick = (template: Template) => {
    setActiveTemplate(template);
    // Reset answers
    const initialAnswers: Record<string, string> = {};
    template.questions.forEach(q => {
      if (q.type === 'select' && q.options) {
        initialAnswers[q.id] = q.options[0];
      } else {
        initialAnswers[q.id] = "";
      }
    });
    setTemplateAnswers(initialAnswers);
  };

  const handleCustomTemplateSubmit = () => {
    if (!activeTemplate) return;
    
    let detailedPrompt = activeTemplate.prompt;
    detailedPrompt += "\n\n[SPESIFIKASI TAMBAHAN DARI USER]:";
    
    Object.entries(templateAnswers).forEach(([id, answer]) => {
      const question = activeTemplate.questions.find(q => q.id === id);
      if (question) {
        detailedPrompt += `\n- ${question.label}: ${answer}`;
      }
    });

    setInput(detailedPrompt);
    setActiveTemplate(null);
    
    // Trigger submit manually by creating a fake event
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    // We need to wait for state to update or use a ref/closure
    // For simplicity, I'll just set the input and let the user click send, 
    // OR I can call a modified handleSubmit that takes the prompt directly.
  };

  const handleSubmit = async (e: React.FormEvent, directPrompt?: string) => {
    e.preventDefault();
    const promptToUse = directPrompt || input;
    if (!promptToUse.trim() || isLoading || !user) return;

    let sessionId = currentSessionId;
    const userPrompt = promptToUse;
    if (!directPrompt) setInput("");
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

      const engineToUse = (localStorage.getItem("ai_engine") as "gemini" | "deepseek") || "gemini";
      const stream = generateCodeStream(
        [...messages, { role: "user", content: finalInput }], 
        SYSTEM_INSTRUCTION,
        userData?.status === 'Pro',
        engineToUse === "gemini" ? apiKeys.geminiApiKey : apiKeys.deepseekApiKey,
        engineToUse,
        userMemory
      );

      let fullResponse = "";
      const assistantMessageId = crypto.randomUUID();
      
      // We keep isLoading true until the first chunk arrives
      let firstChunk = true;

      for await (const chunk of stream) {
        if (firstChunk) {
          setIsLoading(false);
          setStreamingMessage("");
          firstChunk = false;
        }
        fullResponse += chunk;
        setStreamingMessage(fullResponse);
      }
      
      setStreamingMessage(null);

      // Add assistant message to Firestore
      try {
        await addDoc(collection(db, "sessions", sessionId!, "messages"), {
          id: assistantMessageId,
          role: "assistant",
          content: fullResponse,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `sessions/${sessionId}/messages`);
      }

      // Update Memory in background
      if (user) {
        const newMemory = await extractMemory(
          [...messages, { role: "user", content: finalInput }, { role: "assistant", content: fullResponse }],
          userMemory,
          apiKeys.geminiApiKey
        );

        if (newMemory) {
          try {
            await setDoc(doc(db, "memories", user.uid), {
              ...newMemory,
              userId: user.uid,
              updatedAt: serverTimestamp()
            }, { merge: true });
          } catch (err) {
            console.error("Failed to update memory:", err);
          }
        }
      }

    } catch (error) {
      console.error("Error generating response:", error);
      // We don't save error messages to Firestore usually
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalTemplateSubmit = () => {
    if (!activeTemplate) return;
    
    let detailedPrompt = activeTemplate.prompt;
    detailedPrompt += "\n\n[SPESIFIKASI TAMBAHAN DARI USER]:";
    
    Object.entries(templateAnswers).forEach(([id, answer]) => {
      const question = activeTemplate.questions.find(q => q.id === id);
      if (question && answer.trim()) {
        // Only include answers for questions that satisfy their condition
        if (!question.condition || question.condition(templateAnswers)) {
          detailedPrompt += `\n- ${question.label}: ${answer}`;
          
          // Add specific instruction for ultra responsive
          if (id === 'responsive' && answer.includes('Ultra Responsive')) {
            detailedPrompt += ` (PENTING: Pada tampilan mobile, perkecil font-size, kurangi border-radius, perkecil margin & padding, serta sesuaikan line-height agar terlihat lebih rapat, tipis, dan profesional seperti aplikasi native premium)`;
          }
        }
      }
    });

    setActiveTemplate(null);
    handleSubmit({ preventDefault: () => {} } as React.FormEvent, detailedPrompt);
  };

  const clearChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setUploadedFiles([]);
  };

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessionToDelete(id);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteDoc(doc(db, "sessions", sessionToDelete));
      if (currentSessionId === sessionToDelete) {
        clearChat();
      }
      setSessionToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sessions/${sessionToDelete}`);
    }
  };

  const updateSessionTitle = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    try {
      await setDoc(doc(db, "sessions", sessionId), {
        title: newTitle,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setEditingSessionId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sessions/${sessionId}`);
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
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const sessionTitle = currentSession ? currentSession.title : "";

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 overflow-hidden">
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        isAdmin={userData?.role === 'admin'}
        allUsers={allUsers}
        onVerifyUser={verifyUser}
        onLogout={handleLogout}
        currentUserEmail={user?.email}
      />

      <AnimatePresence>
        {activeTemplate && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveTemplate(null)}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-8 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-[#ffd700]" />
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <activeTemplate.icon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Kustomisasi {activeTemplate.name}</h3>
                  <p className="text-sm text-zinc-400">Lengkapi detail berikut untuk hasil yang lebih spesifik.</p>
                </div>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                {activeTemplate.questions.filter(q => !q.condition || q.condition(templateAnswers)).map((q) => (
                  <div key={q.id} className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">{q.label}</label>
                    {q.type === 'select' ? (
                      <div className="flex flex-wrap gap-2">
                        {q.options?.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setTemplateAnswers(prev => ({ ...prev, [q.id]: opt }))}
                            className={cn(
                              "px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all border",
                              templateAnswers[q.id] === opt
                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={templateAnswers[q.id] || ""}
                        onChange={(e) => setTemplateAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder={q.placeholder}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all placeholder:text-zinc-600"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setActiveTemplate(null)}
                  className="flex-1 px-6 py-4 rounded-2xl bg-zinc-800 text-zinc-300 font-bold text-sm hover:bg-zinc-700 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleFinalTemplateSubmit}
                  className="flex-[2] px-6 py-4 rounded-2xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  <span>Generate Project</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {sessionToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSessionToDelete(null)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Hapus Sesi?</h3>
                <p className="text-sm text-zinc-400">Apakah Anda yakin ingin menghapus sesi ini? Tindakan ini tidak dapat dibatalkan.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="flex-1 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm hover:bg-zinc-700 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDeleteSession}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 72 }}
        className="h-full bg-zinc-900/50 border-r border-zinc-800/50 flex flex-col overflow-hidden transition-all duration-300"
      >
        <div className={cn("flex flex-col h-full", isSidebarOpen ? "p-6" : "p-4 items-center")}>
          {isSidebarOpen ? (
            <div className="flex items-center gap-3 mb-8">
              <div className="w-40 h-fit-content overflow-hidden flex items-start justify-center">
                <img 
                  src="https://vaslink.site/vaslink.png" 
                  alt="Vaslink Logo" 
                  className="w-full h-full object-contain object-top" 
                  referrerPolicy="no-referrer" 
                />
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Bot size={18} className="text-emerald-500" />
              </div>
            </div>
          )}

          <button
            onClick={clearChat}
            className={cn(
              "flex items-center gap-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-all text-sm font-medium mb-6 border border-zinc-700/50",
              isSidebarOpen ? "w-full p-3" : "w-10 h-10 justify-center p-0"
            )}
            title="New Session"
          >
            <Plus size={18} className="text-emerald-500" />
            {isSidebarOpen && <span>New Session</span>}
          </button>

          <div className="flex-1 space-y-4 overflow-y-auto scrollbar-none w-full">
            {isSidebarOpen && (
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
                        onClick={() => {
                          if (editingSessionId !== session.id) {
                            setCurrentSessionId(session.id);
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between gap-3 w-full p-3 rounded-xl transition-all text-sm text-left group cursor-pointer",
                          currentSessionId === session.id 
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                            : "hover:bg-zinc-800/50 text-zinc-400"
                        )}
                      >
                        <div className="flex items-center gap-3 truncate flex-1 min-w-0">
                          {editingSessionId === session.id ? (
                            <input
                              autoFocus
                              className="bg-zinc-800 text-white px-2 py-1 rounded border border-emerald-500/50 outline-none w-full"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={() => updateSessionTitle(session.id, editingTitle)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') updateSessionTitle(session.id, editingTitle);
                                if (e.key === 'Escape') setEditingSessionId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="truncate flex-1">{session.title}</span>
                          )}
                        </div>
                        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                          {editingSessionId !== session.id && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSessionId(session.id);
                                setEditingTitle(session.title);
                              }}
                              className="p-1 hover:bg-zinc-700 rounded transition-all text-zinc-500 hover:text-emerald-400"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => deleteSession(e, session.id)}
                            className="p-1 hover:bg-zinc-700 rounded transition-all text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {!isSidebarOpen && (
              <div className="flex flex-col items-center gap-4">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
                  title="Open Sidebar"
                >
                  <Code size={20} />
                </button>
              </div>
            )}

            {isSidebarOpen && uploadedFiles.length > 0 && (
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
          </div>

          <div className={cn("mt-auto pt-6 border-t border-zinc-800/50 space-y-2 w-full", !isSidebarOpen && "flex flex-col items-center")}>
            {isSidebarOpen ? (
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
            ) : (
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors mb-2"
                title="Profile"
              >
                <UserCircle size={20} />
              </button>
            )}
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className={cn(
                "flex items-center gap-3 rounded-xl hover:bg-zinc-800/50 text-zinc-400 text-sm transition-colors",
                isSidebarOpen ? "w-full p-3" : "w-10 h-10 justify-center p-0"
              )}
              title="Settings"
            >
              <Settings size={18} />
              {isSidebarOpen && <span>Settings</span>}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Header */}
        <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 transition-colors"
                title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
              >
                {isSidebarOpen ? <Terminal size={20} /> : <Code size={20} />}
              </button>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white">
                  {sessionTitle}
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
          <div className="max-w-5xl mx-auto px-4 py-8 md:px-8 w-full space-y-8">
            {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">Apa yang ingin kamu buat hari ini?</h2>
                <p className="text-zinc-400 max-w-md mx-auto">
                  Saya seorang Spesialis PHP, MySQL, CSS, HTML, dan Javascript. Minta saya untuk membuat komponen, men-debug skrip, atau mendesain antarmuka profesional..
                </p>
              </div>

              <div className="w-full pt-8">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-4">Pilih Template Proyek</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
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
                  "flex flex-col gap-2 transition-all",
                  msg.role === "assistant" ? "text-yellow-500" : "text-lime-100 italic items-end"
                )}
              >
                <div className={cn(
                  "flex-1 min-w-0",
                  msg.role !== "assistant" && "bg-zinc-900/50 border border-zinc-800/50 p-4 rounded-2xl max-w-[85%]"
                )}>
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

            {streamingMessage !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2 transition-all text-yellow-500"
              >
                <div className="flex-1 min-w-0">
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
                      {streamingMessage}
                    </ReactMarkdown>
                    <span className="inline-block w-2 h-5 bg-emerald-500 ml-1 animate-cursor align-middle" />
                  </div>
                </div>
              </motion.div>
            )}
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
                <span>Vaslink sedang berfikir...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md sticky bottom-0">
        <div className="max-w-5xl mx-auto p-6 w-full">
          <form onSubmit={handleSubmit} className="w-full relative">
            {/* File Preview above input */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 px-3 rounded-full bg-zinc-900 border border-zinc-800 text-[12px] text-zinc-300">
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
                  className="w-full bg-zinc-900 border-none rounded-[36px] px-8 py-5 pr-16 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all resize-none min-h-[80px] max-h-40 text-zinc-100 placeholder:text-zinc-600 shadow-2xl overflow-y-auto"
                  rows={1}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
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
