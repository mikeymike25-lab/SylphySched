import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ShieldAlert, Loader2 } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../utils/firebase';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (providerName: 'google' | 'facebook') => {
    setLoadingProvider(providerName);
    setError(null);

    const provider = providerName === 'google' ? googleProvider : facebookProvider;

    try {
      await signInWithPopup(auth, provider);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error(`${providerName} login failed:`, err);
      
      // Customize message for common errors
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled. The sign-in popup was closed.');
      } else if (err.code === 'auth/configuration-not-found') {
        setError('Firebase authentication config error. Please verify credentials in your .env file.');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with the same email but different login method.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0c] overflow-hidden select-none">
      
      {/* Background Glowing Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[130px] opacity-25 bg-[#00e5ff] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[130px] opacity-25 bg-[#8b5cf6] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Login Box Container (Liquid Glass iOS style) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        className="w-[90%] max-w-[420px] backdrop-blur-2xl bg-white/[0.01] border border-white/10 rounded-[28px] p-8 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.1),0_24px_50px_rgba(0,0,0,0.5)] z-10 text-center flex flex-col items-center gap-6"
      >
        {/* Header Tag */}
        <span className="font-mono text-[9px] tracking-[0.25em] font-bold text-cyan-400 select-none uppercase">
          Authentication
        </span>

        {/* Brand/App Symbol */}
        <div className="w-14 h-14 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center shadow-inner relative group">
          <div className="absolute inset-0 rounded-full blur-md opacity-20 bg-cyan-400 group-hover:opacity-40 transition-opacity duration-500" />
          <Calendar className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" />
        </div>

        {/* Title & Desc */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-sans">
            SylphySched Weekly
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed mt-2 px-2">
            Sign in to access your personal academic schedules, customize notes, and sync documents offline across devices.
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex items-start gap-2.5 p-3.5 rounded-[16px] border border-rose-500/20 bg-rose-500/5 text-rose-400 text-left text-[11px] leading-relaxed"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Provider Login Buttons */}
        <div className="w-full flex flex-col gap-3.5 mt-2">
          
          {/* Google Sign In */}
          <button
            onClick={() => handleLogin('google')}
            disabled={loadingProvider !== null}
            className={`w-full py-3 px-4 rounded-full border font-mono text-xs tracking-wider transition-all duration-300 flex items-center justify-center cursor-pointer shadow-sm
              ${loadingProvider === 'google'
                ? 'bg-white/5 border-white/10 text-white cursor-not-allowed'
                : 'bg-white text-slate-900 border-white hover:bg-slate-100 hover:shadow-lg hover:shadow-white/5 active:scale-[0.98]'
              }
            `}
          >
            {loadingProvider === 'google' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-900" />
                <span>SIGNING IN...</span>
              </>
            ) : (
              <>
                {/* Colored Google Icon SVG */}
                <svg className="w-4 h-4 mr-2.5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>CONTINUE WITH GOOGLE</span>
              </>
            )}
          </button>

          {/* Facebook Sign In */}
          <button
            onClick={() => handleLogin('facebook')}
            disabled={loadingProvider !== null}
            className={`w-full py-3 px-4 rounded-full border font-mono text-xs tracking-wider transition-all duration-300 flex items-center justify-center cursor-pointer shadow-sm
              ${loadingProvider === 'facebook'
                ? 'bg-[#1877F2]/20 border-[#1877F2]/10 text-white cursor-not-allowed'
                : 'bg-[#1877F2] text-white border-[#1877F2] hover:bg-[#166fe5] hover:shadow-lg hover:shadow-[#1877F2]/20 active:scale-[0.98]'
              }
            `}
          >
            {loadingProvider === 'facebook' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                <span>SIGNING IN...</span>
              </>
            ) : (
              <>
                {/* Facebook Logo SVG */}
                <svg className="w-4 h-4 mr-2.5 fill-white shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>CONTINUE WITH FACEBOOK</span>
              </>
            )}
          </button>

        </div>

        {/* Footer info */}
        <span className="text-[10px] text-slate-500 font-mono select-none mt-2">
          SECURE ENCRYPTED GATEWAY
        </span>

      </motion.div>

    </div>
  );
};
