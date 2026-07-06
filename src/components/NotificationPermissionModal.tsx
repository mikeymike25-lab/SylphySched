import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import type { ThemeConfig } from '../types';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  themeConfig: ThemeConfig;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  themeConfig,
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

          {/* Centered Modal */}
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 select-none pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', stiffness: 120, damping: 16 }}
              className={`w-full max-w-[420px] pointer-events-auto backdrop-blur-3xl p-8 rounded-[28px] border flex flex-col items-center text-center gap-6 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.1),0_24px_60px_rgba(0,0,0,0.6)] transition-colors duration-500 relative
                ${themeConfig.name === 'dark' ? 'bg-[#0c0c0f]/90 border-white/10' : 'bg-white/90 border-slate-900/10'}
              `}
            >
              {/* Top Accent Tag */}
              <span className={`font-mono text-[9px] tracking-[0.25em] font-bold select-none uppercase ${themeConfig.accentTextClass}`}>
                Push Notification Center
              </span>

              {/* Notification Bell Icon with dynamic pulse */}
              <div className={`w-14 h-14 rounded-full border flex items-center justify-center shadow-inner relative group
                ${themeConfig.name === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-900/10 bg-slate-900/[0.02]'}
              `}>
                <div className="absolute inset-0 rounded-full blur-md opacity-25 bg-cyan-400 animate-pulse" />
                <Bell className={`w-6 h-6 ${themeConfig.name === 'dark' ? 'text-white' : 'text-slate-800'} animate-bounce`} />
              </div>

              {/* Title & Explanation */}
              <div className="flex flex-col gap-2">
                <h1 className={`text-lg font-bold tracking-tight uppercase font-sans ${themeConfig.textBrightClass}`}>
                  Stay Notified!
                </h1>
                <p className={`text-xs leading-relaxed px-1 ${themeConfig.textMutedClass}`}>
                  Sylphy will send alert cards directly to your device (including mobile phones) when classes are starting, when tasks are due, and when new quotes update.
                </p>
              </div>

              {/* Buttons */}
              <div className="w-full flex flex-col gap-3 mt-2 shrink-0">
                {/* Accept Button */}
                <button
                  onClick={onConfirm}
                  className={`w-full py-3 rounded-full font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-md transform active:scale-[0.98]
                    ${themeConfig.name === 'dark'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_4px_15px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }
                  `}
                >
                  <span>ENABLE NOTIFICATIONS</span>
                </button>

                {/* Dismiss Button */}
                <button
                  onClick={onClose}
                  className={`w-full py-3 rounded-full border font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 transform active:scale-[0.98]
                    ${themeConfig.name === 'dark'
                      ? 'bg-white/[0.01] border-white/10 hover:bg-white/[0.04] text-slate-300'
                      : 'bg-white border-slate-900/10 hover:bg-slate-50 text-slate-700'
                    }
                  `}
                >
                  <span>MAYBE LATER</span>
                </button>
              </div>

              {/* Close Icon button */}
              <button
                onClick={onClose}
                className={`absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/[0.04] transition-all cursor-pointer ${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass}`}
                title="Dismiss Dialog"
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
