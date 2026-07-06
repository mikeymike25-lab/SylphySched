import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, ArrowLeft, X, Calendar, MessageSquare, Bell, ChevronRight, Music, BookOpen } from 'lucide-react';
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
  const [currentStep, setCurrentStep] = useState(0);

  const PAGES = [
    {
      tag: "Welcome Portal",
      title: `Welcome${userName ? `, ${userName}` : ''}!`,
      description: "Welcome to SylphySched! I built this application to be your ultimate academic planner. It helps you organize weekly classes, manage study notes, track tasks, and sync push reminders across all your devices.",
      icon: Sparkles,
      color: "bg-cyan-500",
      textClass: "text-cyan-400"
    },
    {
      tag: "Smart Scheduling",
      title: "Build Your Timeline",
      description: "You can click the '+' Floating Action Button in the bottom-right corner of the schedule screen to add class events manually. Or, paste your raw syllabus text and let my Gemini AI integration structure your calendar in seconds!",
      icon: Calendar,
      color: "bg-purple-500",
      textClass: "text-purple-400"
    },
    {
      tag: "Task Management",
      title: "Study Notes & Reminders",
      description: "Click on any class block in your timeline to write study notes, list sub-tasks, and configure deadlines. Sylphy will automatically trigger local and background push notifications before your tasks are due!",
      icon: Bell,
      color: "bg-amber-500",
      textClass: "text-amber-400"
    },
    {
      tag: "Focus Music",
      title: "Spotify Playback Controls",
      description: "Connect your Spotify Premium account in the Settings panel! You can search focus playlists, play/pause focus music, and toggle study tracks directly inside the dashboard to elevate your productivity.",
      icon: Music,
      color: "bg-emerald-500",
      textClass: "text-emerald-400"
    },
    {
      tag: "Daily Uplift",
      title: "Scripture & Motivation Boosts",
      description: "To keep your energy high, Sylphy triggers a positive notification every 2 hours containing a fresh scripture verse and a motivational quote. Lock-screen boosts sent directly to your phone!",
      icon: BookOpen,
      color: "bg-indigo-500",
      textClass: "text-indigo-400"
    },
    {
      tag: "AI Assistance",
      title: "Chat with Sylphy",
      description: "Interact with the Sylphy AI Chatbot at the bottom of the screen. You can ask Sylphy to summarize your day, recall study notes, or give recommendations. Make sure to allow notification permissions to stay synced!",
      icon: MessageSquare,
      color: "bg-pink-500",
      textClass: "text-pink-400"
    }
  ];

  const handleNext = () => {
    if (currentStep < PAGES.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const activePage = PAGES[currentStep];
  const IconComponent = activePage.icon;

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
              className={`w-full max-w-[460px] pointer-events-auto backdrop-blur-3xl p-8 rounded-[28px] border flex flex-col items-center text-center gap-6 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.1),0_24px_60px_rgba(0,0,0,0.6)] transition-colors duration-500 relative min-h-[460px] justify-between
                ${themeConfig.name === 'dark' ? 'bg-[#0c0c0f]/90 border-white/10' : 'bg-white/90 border-slate-900/10'}
              `}
            >
              {/* Close Button / Dismiss */}
              <button
                onClick={onClose}
                className={`absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/[0.04] transition-all cursor-pointer ${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass}`}
                title="Dismiss Welcome Portal"
              >
                <X className="w-4 h-4" />
              </button>

              {/* TOP: Accent Tag */}
              <span className={`font-mono text-[9px] tracking-[0.25em] font-bold select-none uppercase ${themeConfig.accentTextClass}`}>
                {activePage.tag}
              </span>

              {/* CENTER: Dynamic Content Slide (Framer Motion page transition animation) */}
              <div className="flex-1 flex flex-col items-center justify-center w-full my-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ x: 15, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -15, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-4 w-full"
                  >
                    {/* Animated Glow Circle Icon */}
                    <div className={`w-14 h-14 rounded-full border flex items-center justify-center shadow-inner relative group
                      ${themeConfig.name === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-900/10 bg-slate-900/[0.02]'}
                    `}>
                      <div className={`absolute inset-0 rounded-full blur-md opacity-25 transition-all duration-500 ${activePage.color}`} />
                      <IconComponent className={`w-6 h-6 z-10 ${themeConfig.name === 'dark' ? 'text-white' : 'text-slate-800'}`} />
                    </div>

                    {/* Title */}
                    <h1 className={`text-lg font-bold tracking-tight uppercase font-sans ${themeConfig.textBrightClass}`}>
                      {activePage.title}
                    </h1>

                    {/* Description */}
                    <p className={`text-xs leading-relaxed px-4 text-center ${themeConfig.textMutedClass} min-h-[80px]`}>
                      {activePage.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* BOTTOM: Navigation controls */}
              <div className="w-full flex flex-col items-center gap-4 shrink-0">
                
                {/* Dots indicator */}
                <div className="flex gap-2">
                  {PAGES.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentStep
                          ? 'w-4 ' + (themeConfig.name === 'dark' ? 'bg-cyan-400' : 'bg-slate-800')
                          : 'w-1.5 bg-slate-600/40'
                      }`}
                    />
                  ))}
                </div>

                {/* Button layout */}
                <div className="w-full flex flex-col gap-3">
                  {currentStep < PAGES.length - 1 ? (
                    <div className="w-full flex gap-3">
                      {/* Back button */}
                      {currentStep > 0 ? (
                        <button
                          onClick={handleBack}
                          className={`flex-1 py-3 rounded-full border font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 transform active:scale-[0.98]
                            ${themeConfig.name === 'dark'
                              ? 'bg-white/[0.01] border-white/10 hover:bg-white/[0.04] text-slate-300'
                              : 'bg-white border-slate-900/10 hover:bg-slate-50 text-slate-700'
                            }
                          `}
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>BACK</span>
                        </button>
                      ) : (
                        <button
                          onClick={onSkip}
                          className={`flex-1 py-3 rounded-full border font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 transform active:scale-[0.98]
                            ${themeConfig.name === 'dark'
                              ? 'bg-white/[0.01] border-white/10 hover:bg-white/[0.04] text-slate-400 border-dashed'
                              : 'bg-white border-slate-900/10 hover:bg-slate-50 text-slate-500 border-dashed'
                            }
                          `}
                        >
                          <span>SKIP MANUAL</span>
                        </button>
                      )}

                      {/* Next button */}
                      <button
                        onClick={handleNext}
                        className={`flex-1 py-3 rounded-full font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 transform active:scale-[0.98]
                          ${themeConfig.name === 'dark'
                            ? 'bg-white/[0.06] hover:bg-white/[0.1] text-cyan-400 border border-cyan-400/20 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }
                        `}
                      >
                        <span>NEXT</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col gap-3">
                      {/* AI Setup Trigger */}
                      <button
                        onClick={onGetStarted}
                        className="w-full py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_4px_15px_rgba(124,58,237,0.3)] transform active:scale-[0.98]"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>IMPORT SYLLABUS WITH AI</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Start empty timeline */}
                      <button
                        onClick={onSkip}
                        className={`w-full py-3 rounded-full border font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 transform active:scale-[0.98]
                          ${themeConfig.name === 'dark'
                            ? 'bg-white/[0.01] border-white/10 hover:bg-white/[0.04] text-slate-300'
                            : 'bg-white border-slate-900/10 hover:bg-slate-50 text-slate-700'
                          }
                        `}
                      >
                        <span>START WITH EMPTY TIMELINE</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
