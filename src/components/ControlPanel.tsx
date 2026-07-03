import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, FastForward, Info, BarChart2, Calendar, ShieldAlert, X, BookOpen, Sparkles, Copy, Check } from 'lucide-react';
import type { ScheduleItem, ThemeConfig } from '../types';
import { timeToMinutes, toStandardTime } from './AscendingTimeline';
import type { Inspiration } from '../utils/inspiration';
import { SpotifyPlayer } from './SpotifyPlayer';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 140,
      damping: 14,
    },
  },
};

interface ControlPanelProps {
  currentTime: Date;
  scheduleItems: ScheduleItem[];
  isSimulating: boolean;
  setIsSimulating: (val: boolean) => void;
  simSpeed: number;
  setSimSpeed: (val: number) => void;
  onResetTime: () => void;
  onTimeOffsetChange: (minutes: number) => void;
  timeOffset: number;
  notificationPermission: NotificationPermission;
  notificationsEnabled: boolean;
  onCloseMobile?: () => void;
  themeConfig: ThemeConfig;
  dailyInspiration: Inspiration;
  
  // Spotify Integration Props
  spotifyToken: string | null;
  onSpotifyConnect: (token: string) => void;
  onSpotifyDisconnect: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentTime,
  scheduleItems,
  isSimulating,
  setIsSimulating,
  simSpeed,
  setSimSpeed,
  onResetTime,
  onTimeOffsetChange,
  timeOffset,
  notificationPermission,
  notificationsEnabled,
  onCloseMobile,
  themeConfig,
  dailyInspiration,
  spotifyToken,
  onSpotifyConnect,
  onSpotifyDisconnect,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    const textToCopy = `Daily Inspiration\n\nVerse: "${dailyInspiration.verse}" — ${dailyInspiration.verseReference}\n\nQuote: "${dailyInspiration.quote}" — ${dailyInspiration.quoteAuthor}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  // Format digital clock to standard 12-hour format
  let hours = currentTime.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // hour '0' should be '12'
  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = currentTime.getMinutes().toString().padStart(2, '0');
  const formattedSeconds = currentTime.getSeconds().toString().padStart(2, '0');

  // Format date
  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [currentTime]);

  // Compute next event info
  const nextEventInfo = useMemo(() => {
    const currentMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Sort items chronologically
    const sorted = [...scheduleItems].sort(
      (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );

    // Find first event where start_time is greater than current time
    const nextEvent = sorted.find((item) => timeToMinutes(item.start_time) > currentMin);

    // Find if we are currently in an event
    const activeEvent = sorted.find(
      (item) => currentMin >= timeToMinutes(item.start_time) && currentMin < timeToMinutes(item.end_time)
    );

    if (activeEvent) {
      const minutesRemaining = timeToMinutes(activeEvent.end_time) - currentMin;
      return {
        status: 'ACTIVE_NOW',
        event: activeEvent,
        subtext: `Ending in ${Math.round(minutesRemaining)} min`,
      };
    }

    if (nextEvent) {
      const minutesUntil = timeToMinutes(nextEvent.start_time) - currentMin;
      const hours = Math.floor(minutesUntil / 60);
      const mins = Math.floor(minutesUntil % 60);
      const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      return {
        status: 'UPCOMING',
        event: nextEvent,
        subtext: `Starts in ${timeString}`,
      };
    }

    return {
      status: 'IDLE',
      event: null,
      subtext: 'No further sessions scheduled',
    };
  }, [currentTime, scheduleItems]);

  // Compute stats
  const stats = useMemo(() => {
    const totalMinutes = scheduleItems.reduce((acc, item) => {
      return acc + (timeToMinutes(item.end_time) - timeToMinutes(item.start_time));
    }, 0);

    const hours = (totalMinutes / 60).toFixed(1);
    const count = scheduleItems.length;

    return {
      totalHours: hours,
      eventCount: count,
    };
  }, [scheduleItems]);

  // Handler for manual slider offset
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTimeOffsetChange(Number(e.target.value));
  };

  return (
    <div className={`w-full h-full text-text-muted p-6 border-l flex flex-col justify-between overflow-y-auto select-none backdrop-blur-md transition-colors duration-500
      ${themeConfig.panelClass}
    `}>
      
      {/* Panel Header */}
      <div className={`flex flex-col gap-1 border-b pb-4 mb-6 shrink-0 ${themeConfig.borderClass}`}>
        <div className="flex items-center justify-between">
          <span className={`font-mono text-[10px] tracking-[0.2em] font-bold ${themeConfig.accentTextClass}`}>
            Control Panel
          </span>
          <div className="flex items-center gap-3.5">
            <span className="flex h-2 w-2 relative">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isSimulating ? `animate-ping ${themeConfig.accentDotClass}` : 'bg-text-dark'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSimulating ? themeConfig.accentDotClass : 'bg-text-dark'}`}></span>
            </span>



            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className={`md:hidden transition-colors cursor-pointer ${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center mt-1">
          <h1 className={`text-lg font-semibold tracking-tight ${themeConfig.textBrightClass}`}>
            System Diagnostics
          </h1>
          {notificationPermission === 'granted' ? (
            <span className={`font-mono text-[9px] px-2 py-0.5 rounded border font-bold select-none shrink-0
              ${notificationsEnabled
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }
            `}>
              ALERTS: {notificationsEnabled ? 'ON' : 'MUTED'}
            </span>
          ) : (
            <span className="font-mono text-[9px] text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded select-none font-bold shrink-0">
              ALERTS: OFF
            </span>
          )}
        </div>
      </div>

      {/* Clock section */}
      <div className={`flex flex-col items-center justify-center py-6 border rounded-[24px] mb-6 relative overflow-hidden shrink-0 group backdrop-blur-md shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.15)] transition-all duration-500 bg-white/[0.03] border-white/10`}>
        {/* Tech background design element */}
        <div className={`absolute top-0 right-0 p-1 font-mono text-[8px] select-none ${themeConfig.textDarkClass}`}>
          UTC+8:00
        </div>
        <div className={`font-mono text-3xl font-bold tracking-widest drop-shadow-[0_0_10px_rgba(243,244,246,0.05)] transition-colors duration-500 flex items-baseline ${themeConfig.textBrightClass} group-hover:${themeConfig.accentTextClass}`}>
          <span>{formattedHours}</span>
          <span className="animate-pulse mx-0.5">:</span>
          <span>{formattedMinutes}</span>
          <span className="animate-pulse mx-0.5">:</span>
          <span>{formattedSeconds}</span>
          <span className={`text-xs font-semibold uppercase tracking-wider ml-2 select-none ${themeConfig.textDarkClass}`}>{ampm}</span>
        </div>
        <div className={`flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase mt-2 ${themeConfig.textMutedClass}`}>
          <Calendar className="w-3.5 h-3.5" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Dynamic Status / Next Up */}
      <div className="flex-1 flex flex-col gap-6 shrink-0">
        <div>
          <h2 className={`text-xs uppercase tracking-[0.15em] font-mono mb-2 flex items-center gap-1.5 ${themeConfig.textDarkClass}`}>
            <Info className="w-3.5 h-3.5" />
            Active Target
          </h2>

          <div className={`border bg-white/[0.01] p-4 rounded-[22px] flex flex-col justify-between min-h-[110px] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-md
            ${themeConfig.name === 'dark' ? 'border-white/10 hover:border-white/20' : 'border-slate-900/10 hover:border-slate-900/20'}
          `}>
            {nextEventInfo.event ? (
              <>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm tracking-wider uppercase select-none
                      ${nextEventInfo.status === 'ACTIVE_NOW'
                        ? `${themeConfig.accentBgClass} ${themeConfig.accentTextClass} ${themeConfig.accentBorderClass} border`
                        : 'bg-white/5 text-text-muted border border-white/5'
                      }
                    `}>
                      {nextEventInfo.status === 'ACTIVE_NOW' ? 'ACTIVE NOW' : 'UPCOMING'}
                    </span>
                    <span className={`font-mono text-[11px] ${themeConfig.textBrightClass}`}>
                      {toStandardTime(nextEventInfo.event.start_time)} - {toStandardTime(nextEventInfo.event.end_time)}
                    </span>
                  </div>
                  <h3 className={`font-sans font-bold text-sm uppercase mt-2 ${themeConfig.textBrightClass}`}>
                    {nextEventInfo.event.subject_name}
                  </h3>
                </div>
                <div className={`font-mono text-[10px] mt-2 border-t pt-2 flex justify-between ${themeConfig.borderClass} ${themeConfig.textDarkClass}`}>
                  <span>{nextEventInfo.subtext}</span>
                  {nextEventInfo.event.room && <span>ROOM: {nextEventInfo.event.room}</span>}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 py-4 text-center">
                <ShieldAlert className={`w-5 h-5 mb-1 ${themeConfig.textDarkClass}`} />
                <span className={`font-mono text-xs tracking-wide uppercase ${themeConfig.textDarkClass}`}>
                  {nextEventInfo.subtext}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Spotify Player Control Card */}
        <SpotifyPlayer
          token={spotifyToken}
          onConnect={onSpotifyConnect}
          onDisconnect={onSpotifyDisconnect}
          themeConfig={themeConfig}
        />

        {/* Daily Inspiration Panel (Liquid Glass iOS style) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col"
        >
          <div className="flex items-center justify-between mb-2 select-none">
            <h2 className={`text-xs uppercase tracking-[0.15em] font-mono flex items-center gap-1.5 ${themeConfig.textDarkClass}`}>
              <BookOpen className="w-3.5 h-3.5" />
              Daily Inspiration
            </h2>
            <button
              onClick={handleCopy}
              className={`p-1.5 rounded-full border transition-all duration-300 flex items-center justify-center cursor-pointer shadow-sm shrink-0
                ${copied 
                  ? `${themeConfig.accentBgClass} ${themeConfig.accentBorderClass} ${themeConfig.accentTextClass}` 
                  : `${themeConfig.name === 'dark' ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-text-dark hover:text-text-bright' : 'border-slate-900/5 bg-slate-900/[0.01] hover:bg-slate-900/[0.05] text-slate-500 hover:text-slate-900'}`
                }
              `}
              title="Copy to clipboard"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1 font-mono text-[9px] font-bold px-1"
                  >
                    <Check className="w-3 h-3 animate-bounce" />
                    <span>COPIED</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Copy className="w-3 h-3" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          <div className={`border p-4 rounded-[22px] flex flex-col gap-4 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-md bg-white/[0.01]
            ${themeConfig.name === 'dark' ? 'border-white/10 hover:border-white/20' : 'border-slate-900/10 hover:border-slate-900/20'}
          `}>
            {/* Bible Verse Section */}
            <motion.div variants={itemVariants} className="flex flex-col gap-1.5 border-b pb-3.5 border-dashed border-white/10 dark:border-white/10 border-slate-900/10">
              <div className={`flex items-center gap-1.5 font-mono text-[9px] font-bold ${themeConfig.accentTextClass}`}>
                <BookOpen className="w-3 h-3" />
                <span>SCRIPTURE</span>
              </div>
              <p className={`text-xs italic leading-relaxed font-sans ${themeConfig.textBrightClass}`}>
                "{dailyInspiration.verse}"
              </p>
              <span className={`text-[10px] font-mono text-right select-text ${themeConfig.textMutedClass}`}>
                — {dailyInspiration.verseReference}
              </span>
            </motion.div>

            {/* Motivation Quote Section */}
            <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
              <div className={`flex items-center gap-1.5 font-mono text-[9px] font-bold ${themeConfig.accentTextClass}`}>
                <Sparkles className="w-3 h-3" />
                <span>MOTIVATION</span>
              </div>
              <p className={`text-xs leading-relaxed font-sans ${themeConfig.textBrightClass}`}>
                "{dailyInspiration.quote}"
              </p>
              <span className={`text-[10px] font-mono text-right select-text ${themeConfig.textMutedClass}`}>
                — {dailyInspiration.quoteAuthor}
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* Schedule Stats */}
        <div>
          <h2 className={`text-xs uppercase tracking-[0.15em] font-mono mb-2 flex items-center gap-1.5 ${themeConfig.textDarkClass}`}>
            <BarChart2 className="w-3.5 h-3.5" />
            Diagnostics Info
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className={`border p-3 rounded-[16px] bg-white/[0.02] transition-all duration-300 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.08)]
              ${themeConfig.name === 'dark' ? 'border-white/10 hover:border-white/20' : 'border-slate-900/10 hover:border-slate-900/20'}
            `}>
              <span className={`block font-mono text-[9px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>
                Total Classes
              </span>
              <span className={`font-mono text-lg font-bold ${themeConfig.textBrightClass}`}>
                {stats.eventCount}
              </span>
            </div>
            <div className={`border p-3 rounded-[16px] bg-white/[0.02] transition-all duration-300 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.08)]
              ${themeConfig.name === 'dark' ? 'border-white/10 hover:border-white/20' : 'border-slate-900/10 hover:border-slate-900/20'}
            `}>
              <span className={`block font-mono text-[9px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>
                Total Hours
              </span>
              <span className={`font-mono text-lg font-bold ${themeConfig.textBrightClass}`}>
                {stats.totalHours} hr
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Simulation / Time Warp controls */}
      <div className={`mt-6 border-t pt-6 flex flex-col gap-4 shrink-0 ${themeConfig.borderClass}`}>
        <div>
          <div className="flex justify-between items-center mb-1">
            <h2 className={`text-xs uppercase tracking-[0.15em] font-mono font-semibold ${themeConfig.textBrightClass}`}>
              Time Warp Simulation
            </h2>
            <span className={`font-mono text-[10px] px-1 py-0.5 rounded-sm ${themeConfig.accentBgClass} ${themeConfig.accentTextClass}`}>
              {timeOffset === 0 ? 'REAL TIME' : `${timeOffset > 0 ? '+' : ''}${Math.round(timeOffset)}m`}
            </span>
          </div>
          <p className={`text-[10px] leading-relaxed font-sans ${themeConfig.textDarkClass}`}>
            Shift or accelerate clock time to observe timeline stagger animations and line updates.
          </p>
        </div>

        {/* Time Slider */}
        <div className="flex flex-col gap-1.5 mt-1">
          <input
            type="range"
            min="-480"
            max="480"
            value={timeOffset}
            onChange={handleSliderChange}
            className={`w-full accent-cyber-cyan rounded-lg cursor-pointer h-1 outline-none ${themeConfig.name === 'dark' ? 'bg-white/10' : 'bg-slate-900/10'}`}
            style={{
              accentColor: themeConfig.name === 'dark' ? '#00e5ff' : themeConfig.name === 'light' ? '#4f46e5' : themeConfig.name === 'pink' ? '#db2777' : '#0284c7'
            }}
          />
          <div className={`flex justify-between font-mono text-[8px] select-none ${themeConfig.textDarkClass}`}>
            <span>-8 hours</span>
            <span>Sync</span>
            <span>+8 hours</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-3 gap-2">
          {/* Play/Pause */}
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center justify-center gap-1 py-2 border rounded-full font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]
              ${isSimulating
                ? `${themeConfig.accentBgClass} ${themeConfig.accentBorderClass} ${themeConfig.accentTextClass} shadow-[0_0_12px_rgba(0,229,255,0.25)]`
                : `${themeConfig.name === 'dark' ? 'border-white/10 hover:border-white/20' : 'border-slate-900/10 hover:border-slate-900/20'} bg-white/[0.02] hover:bg-white/[0.06] ${themeConfig.textMutedClass} hover:${themeConfig.textBrightClass}`
              }
            `}
          >
            {isSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>RUN</span>
              </>
            )}
          </button>

          {/* Speed Multiplier */}
          <button
            onClick={() => {
              if (simSpeed === 1) setSimSpeed(10);
              else if (simSpeed === 10) setSimSpeed(60);
              else if (simSpeed === 60) setSimSpeed(300);
              else setSimSpeed(1);
            }}
            disabled={!isSimulating}
            className={`flex items-center justify-center gap-1 py-2 border rounded-full font-mono text-xs tracking-wider transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]
              ${!isSimulating
                ? `${themeConfig.name === 'dark' ? 'border-white/5' : 'border-slate-900/5'} text-text-dark cursor-not-allowed opacity-30 bg-transparent`
                : `${themeConfig.name === 'dark' ? 'border-white/10 hover:border-white/20' : 'border-slate-900/10 hover:border-slate-900/20'} bg-white/[0.02] hover:bg-white/[0.06] ${themeConfig.textMutedClass} hover:${themeConfig.textBrightClass} cursor-pointer`
              }
            `}
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>{simSpeed}X</span>
          </button>

          {/* Reset */}
          <button
            onClick={onResetTime}
            className={`flex items-center justify-center gap-1 py-2 border rounded-full font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]
              ${themeConfig.name === 'dark' ? 'border-white/10 hover:border-white/20' : 'border-slate-900/10 hover:border-slate-900/20'} bg-white/[0.02] hover:bg-white/[0.06] ${themeConfig.textMutedClass} hover:${themeConfig.textBrightClass}
            `}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>

    </div>
  );
};
