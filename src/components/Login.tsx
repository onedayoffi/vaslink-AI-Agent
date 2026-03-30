import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence 
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'motion/react';
import { LogIn, Lock, Mail, Loader2, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';

// Simple device ID generator/retriever
const getDeviceId = () => {
  let id = localStorage.getItem('vaslink_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('vaslink_device_id', id);
  }
  return id;
};

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Set persistence based on rememberMe
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const deviceId = getDeviceId();
        
        // Check registration limit (5 per device)
        // Now that we are authenticated, we can query the users collection
        const q = query(collection(db, 'users'), where('deviceId', '==', deviceId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.size >= 5) {
          // Delete the auth user if limit reached
          await user.delete();
          throw new Error('LIMIT_REACHED');
        }
        
        // Initialize user doc with "Uji Coba" status and deviceId
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          role: email === 'admin@vaslink.site' ? 'admin' : 'user',
          isVerified: email === 'admin@vaslink.site', // Auto-verify admin
          status: email === 'admin@vaslink.site' ? 'Pro' : 'Uji Coba',
          deviceId: deviceId,
          createdAt: new Date().toISOString()
        });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Check if user doc exists, if not create it (important for remixed apps or legacy users)
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          const deviceId = getDeviceId();
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            role: email === 'admin@vaslink.site' ? 'admin' : 'user',
            isVerified: email === 'admin@vaslink.site', // Auto-verify admin
            status: email === 'admin@vaslink.site' ? 'Pro' : 'Uji Coba',
            deviceId: deviceId,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let message = "Terjadi kesalahan saat autentikasi.";
      
      if (err.code === 'auth/invalid-credential') {
        message = "Email atau password salah. Jika Anda baru pertama kali menggunakan aplikasi ini, silakan klik 'Daftar Sekarang' di bawah.";
      } else if (err.message === 'LIMIT_REACHED') {
        message = "Keamanan: Perangkat ini telah mencapai batas maksimal pendaftaran (5 akun).";
      } else if (err.code === 'auth/user-not-found') {
        message = "Akun tidak ditemukan. Silakan daftar terlebih dahulu.";
      } else if (err.code === 'auth/wrong-password') {
        message = "Password yang Anda masukkan salah.";
      } else if (err.code === 'auth/email-already-in-use') {
        message = "Email sudah terdaftar. Silakan masuk atau gunakan email lain.";
      } else if (err.code === 'auth/weak-password') {
        message = "Password terlalu lemah. Gunakan minimal 6 karakter.";
      } else if (err.code === 'auth/invalid-email') {
        message = "Format email tidak valid.";
      }
      
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#1A2335] border border-[#2A3450] rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center">
          <div className="w-48 h-fit-content flex items-center justify-center overflow-hidden">
            <img 
              src="https://vaslink.site/logo-vaslink-code.png" 
              alt="Vaslink Logo" 
              className="w-full h-full object-contain p-2" 
              referrerPolicy="no-referrer" 
            />
          </div>
          <p className="text-[#8096B0] mb-8 text-sm mt-2">
            {isRegistering ? 'Create your account' : 'Sign in to access your coding sessions'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#8096B0] px-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8096B0]" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#2A3450] rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50 focus:border-[#ffd700] transition-all"
                placeholder="email@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#8096B0] px-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8096B0]" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#2A3450] rounded-xl py-3 pl-12 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50 focus:border-[#ffd700] transition-all"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8096B0] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setRememberMe(!rememberMe)}
              className="flex items-center gap-2 text-xs text-[#8096B0] hover:text-white transition-colors group"
            >
              {rememberMe ? (
                <CheckSquare size={16} className="text-[#ffd700]" />
              ) : (
                <Square size={16} className="group-hover:text-[#ffd700]" />
              )}
              <span>Remember Me</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#ffd700] hover:bg-[#F0C45A] text-[#0B0F17] font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
            <span>{isRegistering ? 'Sign Up' : 'Sign In'}</span>
          </button>
        </form>

        <div className="mt-6 text-center space-y-4">
          <p className="text-[#8096B0] text-sm">
            {isRegistering ? 'Sudah punya akun?' : 'Belum punya akun?'}
          </p>
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full py-2 px-4 rounded-xl border border-[#ffd700] text-[#ffd700] text-sm font-bold hover:bg-[#ffd700]/10 transition-all"
          >
            {isRegistering ? 'Masuk Sekarang' : 'Daftar Sekarang'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-[#2A3450] text-center">
          <p className="text-[#8096B0] text-xs">
            Vaslink Advanced AI Coding Agent
          </p>
        </div>
      </motion.div>
    </div>
  );
};
