import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Square, Terminal } from 'lucide-react';
import type { ToastMessage, ThemeConfig } from '../types';

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onRemoveToast: (id: string) => void;
  themeConfig: ThemeConfig;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  toasts,
  onRemoveToast,
  themeConfig,
}) => {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 w-80 max-w-[calc(100vw-3rem)] pointer-events-none select-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isStart = toast.type === 'start';
          const isEnd = toast.type === 'end';

          let Icon = Terminal;
          if (isStart) Icon = Play;
          else if (isEnd) Icon = Square;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 120, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 120, damping: 15 }}
              className={`pointer-events-auto relative overflow-hidden p-4 rounded-[20px] flex items-start gap-3 border backdrop-blur-xl transition-all duration-300
                ${themeConfig.name === 'dark' 
                  ? 'bg-[#0c0c0e]/85 border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]' 
                  : themeConfig.name === 'light' 
                    ? 'bg-white/85 border-slate-900/10 shadow-[0_12px_40px_rgba(15,23,42,0.08)]' 
                    : themeConfig.name === 'pink' 
                      ? 'bg-[#1c0d10]/85 border-pink-500/20 shadow-[0_12px_40px_rgba(28,13,16,0.35)]' 
                      : 'bg-[#060c16]/85 border-sky-500/20 shadow-[0_12px_40px_rgba(6,12,22,0.35)]'
                }
                ${toast.borderColorClass} border-l-2
              `}
            >
              {/* Type specific glow strip at top */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Icon Container */}
              <div className={`p-1.5 rounded-sm flex items-center justify-center mt-0.5 border
                ${themeConfig.name === 'dark' ? 'bg-matte-black/40 border-white/5' : 'bg-slate-900/5 border-slate-900/5'}
              `}>
                <Icon className={`w-4 h-4 ${toast.dotColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col gap-0.5 pr-4">
                <div className="flex items-center gap-1.5 justify-between">
                  <span className={`font-mono text-[10px] font-bold tracking-wider uppercase ${toast.dotColor}`}>
                    {toast.title}
                  </span>
                  <span className={`font-mono text-[9px] ${themeConfig.textDarkClass}`}>
                    {toast.timestamp.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className={`font-sans text-xs leading-relaxed mt-1 ${themeConfig.textBrightClass}`}>
                  {toast.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => onRemoveToast(toast.id)}
                className={`absolute right-2 top-2 p-1 transition-colors cursor-pointer ${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
