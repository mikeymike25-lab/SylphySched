import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import type { ThemeConfig } from '../types';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted: () => void;
  onSkip: () => void;
  themeConfig: ThemeConfig;
  userName?: string | null;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onGetStarted,
  onSkip,
  themeConfig,
  userName,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#060608]/80 backdrop-blur-md pointer-events-auto"
          />

          {/* Centered Welcome Dialog Box (Liquid Glass iOS style) */}
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 select-none pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', stiffness: 120, damping: 16 }}
              className={`w-full max-w-[460px] pointer-events-auto backdrop-blur-3xl p-8 rounded-[28px] border flex flex-col items-center text-center gap-6 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.1),0_24px_60px_rgba(0,0,0,0.6)] transition-colors duration-500
                ${themeConfig.name === 'dark' ? 'bg-[#0c0c0f]/90 border-white/10' : 'bg-white/90 border-slate-900/10'}
              `}
            >
              {/* Top Accent Tag */}
              <span className={`font-mono text-[9px] tracking-[0.25em] font-bold select-none uppercase ${themeConfig.accentTextClass}`}>
                Onboarding Portal
              </span>

              {/* Sparkle Branding Icon */}
              <div className={`w-14 h-14 rounded-full border flex items-center justify-center shadow-inner relative group
                ${themeConfig.name === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-900/10 bg-slate-900/[0.02]'}
              `}>
                <div className={`absolute inset-0 rounded-full blur-md opacity-20 transition-opacity duration-500 bg-cyan-400 group-hover:opacity-40`} />
                <Sparkles className={`w-6 h-6 ${themeConfig.name === 'dark' ? 'text-white' : 'text-slate-800'} group-hover:scale-110 transition-transform duration-300`} />
              </div>

              {/* Title & Welcome description */}
              <div className="flex flex-col gap-2">
                <h1 className={`text-xl font-bold tracking-tight uppercase font-sans ${themeConfig.textBrightClass}`}>
                  Welcome{userName ? `, ${userName}` : ''}!
                </h1>
                <p className={`text-xs leading-relaxed px-2 ${themeConfig.textMutedClass}`}>
                  Let's get your weekly academic schedule set up. You can paste your raw syllabus or class list text, and our AI will automatically structure your timeline in seconds!
                </p>
              </div>

              {/* Action buttons */}
              <div className="w-full flex flex-col gap-3 mt-2 shrink-0">
                {/* AI Setup Trigger */}
                <button
                  onClick={onGetStarted}
                  className="w-full py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_4px_15px_rgba(124,58,237,0.3)] transform active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>IMPORT WITH GEMINI AI</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {/* Skip Setup */}
                <button
                  onClick={onSkip}
                  className={`w-full py-3 rounded-full border font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 transform active:scale-[0.98]
                    ${themeConfig.name === 'dark'
                      ? 'bg-white/[0.01] border-white/10 hover:bg-white/[0.04] text-slate-300'
                      : 'bg-white border-slate-900/10 hover:bg-slate-50 text-slate-700'
                    }
                  `}
                >
                  <span>SKIP SETUP & SEED DEMO</span>
                </button>
              </div>

              {/* Close Button / Alternate Skip */}
              <button
                onClick={onClose}
                className={`absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/[0.04] transition-all cursor-pointer ${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass}`}
                title="Dismiss Welcome Portal"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
