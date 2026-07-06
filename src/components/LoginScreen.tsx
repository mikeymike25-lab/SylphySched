import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../utils/firebase';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual Email/Password auth states
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loadingManual, setLoadingManual] = useState(false);

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
        setError('Sign-in cancelled. Please try again.');
      } else if (err.code === 'auth/configuration-not-found') {
        setError('Sign-in service is currently unavailable. Please try again later.');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists using this email. Please log in with your original sign-in method.');
      } else {
        setError('Sign-in error. Please try again.');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingProvider !== null || loadingManual) return;
    setLoadingManual(true);
    setError(null);

    try {
      if (authMode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please verify and try again.');
          setLoadingManual(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName.trim()) {
          await updateProfile(userCredential.user, {
            displayName: displayName.trim(),
          });
        }
      }
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error(`Manual authentication failed:`, err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Incorrect email or password. Please try again.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email address already exists.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Authentication error. Please try again.');
      }
    } finally {
      setLoadingManual(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0c] select-none">
      
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
        className="w-[90%] max-w-[380px] backdrop-blur-2xl bg-white/[0.01] border border-white/10 rounded-[28px] p-5 sm:p-8 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.1),0_24px_50px_rgba(0,0,0,0.5)] z-10 text-center flex flex-col items-center gap-4 sm:gap-6"
      >
        {/* Header Tag */}
        <span className="font-mono text-[8px] sm:text-[9px] tracking-[0.25em] font-bold text-cyan-400 select-none uppercase">
          Authentication
        </span>

        {/* Brand/App Symbol */}
        <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center relative group">
          <div className="absolute inset-0 rounded-full blur-xl opacity-20 bg-cyan-400 group-hover:opacity-45 transition-opacity duration-500" />
          <img 
            src="/LogoBluelight.png" 
            alt="SylphySched Logo" 
            className="w-10 h-10 sm:w-14 sm:h-14 object-contain z-10 transition-transform duration-300 group-hover:scale-110" 
          />
        </div>

        {/* Title & Desc */}
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white font-sans">
            SylphySched
          </h1>
          <p className="hidden sm:block text-xs text-slate-400 leading-relaxed mt-2 px-2">
            Sign in to access your personal academic schedules, customize notes, and sync documents offline across devices.
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex items-start gap-2.5 p-3 rounded-[16px] border border-rose-500/20 bg-rose-500/5 text-rose-400 text-left text-[11px] leading-relaxed"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Manual Email/Password Form */}
        <form onSubmit={handleManualAuth} className="w-full flex flex-col gap-3 text-left">
          
          {authMode === 'signup' && (
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Username"
              className="w-full px-4 py-2 rounded-full border border-white/10 bg-white/[0.02] text-white text-xs font-sans placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/40 transition-colors"
            />
          )}

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            className="w-full px-4 py-2 rounded-full border border-white/10 bg-white/[0.02] text-white text-xs font-sans placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/40 transition-colors"
          />

          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-2 rounded-full border border-white/10 bg-white/[0.02] text-white text-xs font-sans placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/40 transition-colors"
          />

          {authMode === 'signup' && (
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="w-full px-4 py-2 rounded-full border border-white/10 bg-white/[0.02] text-white text-xs font-sans placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/40 transition-colors"
            />
          )}

          {/* Manual Submit Button */}
          <button
            type="submit"
            disabled={loadingProvider !== null || loadingManual}
            className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-mono text-xs tracking-wider transition-all duration-300 flex items-center justify-center cursor-pointer shadow-[0_4px_15px_rgba(6,182,212,0.3)] active:scale-[0.98] mt-1"
          >
            {loadingManual ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                <span>PROCESSING...</span>
              </>
            ) : (
              <span>{authMode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}</span>
            )}
          </button>

          {/* Toggle authentication mode */}
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
            className="w-full text-center text-[9px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline transition-colors mt-0.5"
          >
            {authMode === 'signin' ? "DON'T HAVE AN ACCOUNT? SIGN UP" : "ALREADY HAVE AN ACCOUNT? SIGN IN"}
          </button>
        </form>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 my-0.5">
          <div className="flex-1 h-[1px] bg-white/10" />
          <span className="text-[8px] sm:text-[9px] font-mono text-slate-500 tracking-wider">OR CONTINUE WITH</span>
          <div className="flex-1 h-[1px] bg-white/10" />
        </div>

        {/* Provider Login Buttons (Compact Side-by-Side) */}
        <div className="w-full flex gap-3">
          
          {/* Google Sign In */}
          <button
            onClick={() => handleLogin('google')}
            disabled={loadingProvider !== null || loadingManual}
            className={`flex-1 py-2 px-3 rounded-full border font-mono text-[9px] tracking-wider transition-all duration-300 flex items-center justify-center cursor-pointer shadow-sm
              ${loadingProvider === 'google'
                ? 'bg-white/5 border-white/10 text-white cursor-not-allowed'
                : 'bg-white text-slate-900 border-white hover:bg-slate-100 active:scale-[0.98]'
              }
            `}
          >
            {loadingProvider === 'google' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-900" />
            ) : (
              <>
                <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>GOOGLE</span>
              </>
            )}
          </button>

          {/* Facebook Sign In */}
          <button
            onClick={() => handleLogin('facebook')}
            disabled={loadingProvider !== null || loadingManual}
            className={`flex-1 py-2 px-3 rounded-full border font-mono text-[9px] tracking-wider transition-all duration-300 flex items-center justify-center cursor-pointer shadow-sm
              ${loadingProvider === 'facebook'
                ? 'bg-[#1877F2]/20 border-[#1877F2]/10 text-white cursor-not-allowed'
                : 'bg-[#1877F2] text-white border-[#1877F2] hover:bg-[#166fe5] active:scale-[0.98]'
              }
            `}
          >
            {loadingProvider === 'facebook' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <>
                <svg className="w-3.5 h-3.5 mr-1.5 fill-white shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>FACEBOOK</span>
              </>
            )}
          </button>

        </div>

        {/* Footer info */}
        <span className="text-[9px] text-slate-500 font-mono select-none mt-1">
          SECURE ENCRYPTED GATEWAY
        </span>

      </motion.div>

    </div>
  );
};
