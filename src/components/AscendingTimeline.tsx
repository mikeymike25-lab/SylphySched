import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, User, ChevronRight } from 'lucide-react';
import type { ScheduleItem, TimelineBlock, ThemeConfig } from '../types';

interface AscendingTimelineProps {
  scheduleItems: ScheduleItem[];
  currentTime: Date;
  themeConfig: ThemeConfig;
  onBlockClick: (block: TimelineBlock) => void;
  userName?: string | null;
}

// Helper to convert "HH:MM" to minutes
export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to convert minutes to "HH:MM"
export const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Helper to convert "HH:MM" (24h) to "H:MM AM/PM" (standard)
export const toStandardTime = (timeStr: string): string => {
  const [hoursStr, minutesStr] = timeStr.split(':');
  let hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // hour '0' should be '12'
  return `${hours}:${minutesStr} ${ampm}`;
};

// Helper to convert minutes value to standard "H:MM AM/PM"
export const minutesToStandardTime = (totalMinutes: number): string => {
  return toStandardTime(minutesToTime(totalMinutes));
};

// Helper to identify overlapping schedules
export const getScheduleConflicts = (items: ScheduleItem[]): Record<string, string[]> => {
  const conflicts: Record<string, string[]> = {};
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const aStart = timeToMinutes(a.start_time);
      const aEnd = timeToMinutes(a.end_time);
      const bStart = timeToMinutes(b.start_time);
      const bEnd = timeToMinutes(b.end_time);
      
      if (aStart < bEnd && bStart < aEnd) {
        if (!conflicts[a.id]) conflicts[a.id] = [];
        if (!conflicts[b.id]) conflicts[b.id] = [];
        conflicts[a.id].push(cleanSubjectName(b.subject_name));
        conflicts[b.id].push(cleanSubjectName(a.subject_name));
      }
    }
  }
  return conflicts;
};

// Helper to clean subject name for conflict message
const cleanSubjectName = (name: string): string => {
  return name
    .replace(/\s*-\s*Lab$/i, '')
    .replace(/\s+Lab$/i, '')
    .trim();
};

// Dynamically gets border, text, and active indicators based on subject codes
const getSubjectColorStyles = (subjectName: string, isActive: boolean) => {
  const match = subjectName.match(/^([A-Z]+\s+\d+)/i);
  const code = match ? match[1].toUpperCase() : subjectName;

  switch (code) {
    case 'IT 006': // Networking
      return {
        border: isActive
          ? 'border-l-2 border-l-cyan-400 border-t-white/20 border-r-white/20 border-b-white/20'
          : 'border-l-2 border-l-cyan-400/60 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-cyan-400',
        dot: 'bg-cyan-400',
        glow: 'shadow-[0_0_12px_rgba(6,182,212,0.25)]',
      };
    case 'IT 009': // SIA
      return {
        border: isActive
          ? 'border-l-2 border-l-purple-400 border-t-white/20 border-r-white/20 border-b-white/20'
          : 'border-l-2 border-l-purple-400/60 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-purple-400',
        dot: 'bg-purple-400',
        glow: 'shadow-[0_0_12px_rgba(168,85,247,0.25)]',
      };
    case 'MATH 304': // Math
      return {
        border: isActive
          ? 'border-l-2 border-l-indigo-400 border-t-white/20 border-r-white/20 border-b-white/20'
          : 'border-l-2 border-l-indigo-400/60 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-indigo-400',
        dot: 'bg-indigo-400',
        glow: 'shadow-[0_0_12px_rgba(99,102,241,0.25)]',
      };
    case 'GEE 002': // GEE
      return {
        border: isActive
          ? 'border-l-2 border-l-slate-300 border-t-white/20 border-r-white/20 border-b-white/20'
          : 'border-l-2 border-l-slate-300/60 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-slate-300',
        dot: 'bg-slate-300',
        glow: 'shadow-[0_0_12px_rgba(148,163,184,0.25)]',
      };
    case 'IT 003': // Advanced DB
      return {
        border: isActive
          ? 'border-l-2 border-l-lime-400 border-t-white/20 border-r-white/20 border-b-white/20'
          : 'border-l-2 border-l-lime-400/60 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-lime-400',
        dot: 'bg-lime-400',
        glow: 'shadow-[0_0_12px_rgba(132,204,22,0.25)]',
      };
    case 'IT 021': // Usable Sec
      return {
        border: isActive
          ? 'border-l-2 border-l-rose-400 border-t-white/20 border-r-white/20 border-b-white/20'
          : 'border-l-2 border-l-rose-400/60 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-rose-400',
        dot: 'bg-rose-400',
        glow: 'shadow-[0_0_12px_rgba(244,63,94,0.25)]',
      };
    case 'IT 005': // Integrative Prog
      return {
        border: isActive
          ? 'border-l-2 border-l-emerald-400 border-t-white/20 border-r-white/20 border-b-white/20'
          : 'border-l-2 border-l-emerald-400/60 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-emerald-400',
        dot: 'bg-emerald-400',
        glow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]',
      };
    case 'TECH 101': // Technopreneurship
      return {
        border: isActive
          ? 'border-l-2 border-l-amber-400 border-t-white/20 border-r-white/20 border-b-white/20'
          : 'border-l-2 border-l-amber-400/60 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-amber-400',
        dot: 'bg-amber-400',
        glow: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]',
      };
    default:
      if (code.startsWith('IRON') || subjectName.toUpperCase().includes('IRON')) {
        return {
          border: isActive
            ? 'border-l-2 border-l-rose-500 border-t-white/20 border-r-white/20 border-b-white/20'
            : 'border-l-2 border-l-rose-500/60 border-t-white/10 border-r-white/10 border-b-white/10',
          text: 'text-rose-500',
          dot: 'bg-rose-500',
          glow: 'shadow-[0_0_12px_rgba(244,63,94,0.3)]',
        };
      }
      return {
        border: isActive
          ? 'border-l-2 border-l-cyber-cyan border-t-white/20 border-r-white/20 border-b-white/20'
          : 'border-l-2 border-l-cyber-cyan/60 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-cyber-cyan',
        dot: 'bg-cyber-cyan',
        glow: 'shadow-[0_0_12px_rgba(0,229,255,0.25)]',
      };
  }
};

export const AscendingTimeline: React.FC<AscendingTimelineProps> = ({
  scheduleItems,
  currentTime,
  themeConfig,
  onBlockClick,
  userName,
}) => {
  const conflicts = useMemo(() => getScheduleConflicts(scheduleItems), [scheduleItems]);

  // Scale factor: 1 minute = 1.6 pixels
  const pxPerMinute = 1.6;

  // Compute standard day boundaries based on items, padding, and current time
  const timelineRange = useMemo(() => {
    if (scheduleItems.length === 0) {
      return { start: 480, end: 1080 }; // Default 08:00 - 18:00
    }

    const minutesList = scheduleItems.flatMap((item) => [
      timeToMinutes(item.start_time),
      timeToMinutes(item.end_time),
    ]);

    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    minutesList.push(currentMinutes);

    const minMinutes = Math.min(...minutesList);
    const maxMinutes = Math.max(...minutesList);

    // Dynamic padding: round to nearest hour, at least 1 hour padding
    const start = Math.max(0, Math.floor(minMinutes / 60) * 60 - 60);
    const end = Math.min(1440, Math.ceil(maxMinutes / 60) * 60 + 60);

    return { start, end };
  }, [scheduleItems, currentTime]);

  // Construct blocks (events + gaps) chronologically
  const timelineBlocks = useMemo(() => {
    // Sort items by start time
    const sortedItems = [...scheduleItems].sort(
      (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );

    const blocks: TimelineBlock[] = [];
    let cursor = timelineRange.start;

    sortedItems.forEach((item) => {
      const itemStart = timeToMinutes(item.start_time);
      const itemEnd = timeToMinutes(item.end_time);

      // If item starts before the timeline start boundary, adjust boundary or skip
      if (itemStart < timelineRange.start) return;

      // Detect free time gap before this class
      if (itemStart > cursor) {
        blocks.push({
          id: `gap-${cursor}-${itemStart}`,
          type: 'gap',
          start_time: minutesToTime(cursor),
          end_time: minutesToTime(itemStart),
          durationMinutes: itemStart - cursor,
        });
      }

      // Add the class event
      blocks.push({
        id: item.id,
        type: 'event',
        subject_name: item.subject_name,
        start_time: item.start_time,
        end_time: item.end_time,
        room: item.room,
        instructor: item.instructor,
        durationMinutes: itemEnd - itemStart,
      });

      cursor = itemEnd;
    });

    // Detect free time gap at the end of the timeline
    if (cursor < timelineRange.end) {
      blocks.push({
        id: `gap-${cursor}-${timelineRange.end}`,
        type: 'gap',
        start_time: minutesToTime(cursor),
        end_time: minutesToTime(timelineRange.end),
        durationMinutes: timelineRange.end - cursor,
      });
    }

    return blocks;
  }, [scheduleItems, timelineRange]);

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const showCurrentTimeLine = currentMinutes >= timelineRange.start && currentMinutes <= timelineRange.end;
  const currentMinutesFromStart = currentMinutes - timelineRange.start;
  const currentLineBottomPos = currentMinutesFromStart * pxPerMinute;

  // Stagger variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const blockVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 90,
        damping: 14,
      },
    },
  };

  return (
    <div className={`relative w-full flex flex-col h-full bg-transparent p-6 select-none overflow-y-auto transition-colors duration-500
      ${themeConfig.textMutedClass}
    `}>
      {/* Timeline Header Info */}
      <div className={`mb-6 flex justify-between items-end border-b pb-4 ${themeConfig.borderClass}`}>
        <div>
          <h2 className={`text-xs uppercase tracking-[0.2em] font-mono ${themeConfig.textDarkClass}`}>
            Timeline Output
          </h2>
          <h1 className={`text-xl font-semibold tracking-tight mt-1 ${themeConfig.textBrightClass}`}>
            {userName ? `${userName}'s Schedule` : 'My Schedule'}
          </h1>
        </div>
        <div className={`text-right font-mono text-xs ${themeConfig.textDarkClass}`}>
          RANGE: {minutesToStandardTime(timelineRange.start)} - {minutesToStandardTime(timelineRange.end)} | SCALE: {pxPerMinute.toFixed(1)}px/m
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="relative flex-1 flex w-full">
        {/* Time Axis Left Column */}
        <div className={`w-16 flex flex-col justify-between py-2 text-right pr-4 border-r font-mono text-xs select-none h-full relative ${themeConfig.borderClass} ${themeConfig.textDarkClass}`}
             style={{ height: `${(timelineRange.end - timelineRange.start) * pxPerMinute}px` }}>
          
          {/* Dynamic Hour Markers */}
          {Array.from({ length: Math.ceil((timelineRange.end - timelineRange.start) / 60) + 1 }).map((_, idx) => {
            const minutes = timelineRange.start + idx * 60;
            if (minutes > timelineRange.end) return null;
            const topPos = (minutes - timelineRange.start) * pxPerMinute;
            return (
              <div
                key={`axis-${minutes}`}
                className="absolute right-4 transform -translate-y-1/2 flex items-center gap-1"
                style={{ top: `${topPos}px` }}
              >
                <span>{minutesToStandardTime(minutes)}</span>
                <span className={`w-1 h-[1px] ${themeConfig.name === 'dark' ? 'bg-white/10' : 'bg-slate-900/10'}`}></span>
              </div>
            );
          })}
        </div>

        {/* Schedule Blocks Column */}
        <motion.div
          className="flex-1 flex flex-col relative pl-6 h-full"
          style={{ height: `${(timelineRange.end - timelineRange.start) * pxPerMinute}px` }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Grid lines in background */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
            {Array.from({ length: Math.ceil((timelineRange.end - timelineRange.start) / 60) + 1 }).map((_, idx) => {
              const minutes = timelineRange.start + idx * 60;
              if (minutes > timelineRange.end) return null;
              const topPos = (minutes - timelineRange.start) * pxPerMinute;
              return (
                <div
                  key={`grid-${minutes}`}
                  className={`absolute left-0 right-0 border-b ${themeConfig.name === 'dark' ? 'border-white/[0.03]' : 'border-slate-900/[0.05]'}`}
                  style={{ top: `${topPos}px` }}
                />
              );
            })}
          </div>

          {/* Render Timeline Blocks (Mapped to flex-col-reverse, so index 0 stack bottom) */}
          {timelineBlocks.map((block) => {
            const blockHeight = block.durationMinutes * pxPerMinute;
            const isEvent = block.type === 'event';
            
            // Check if current time is inside this event
            const isCurrentlyActive = isEvent && showCurrentTimeLine &&
              currentMinutes >= timeToMinutes(block.start_time) &&
              currentMinutes < timeToMinutes(block.end_time);

            if (!isEvent) {
              // Gap/Free Time Block
              return (
                <motion.div
                  key={block.id}
                  variants={blockVariants}
                  style={{ height: `${blockHeight}px` }}
                  className={`relative w-full border-l border-dashed flex items-center pl-4 group transition-all duration-300 z-10
                    ${themeConfig.name === 'dark' ? 'border-white/10 hover:border-white/20' : 'border-slate-900/15 hover:border-slate-900/30'}
                  `}
                >
                  <span className={`font-mono text-[10px] tracking-wider uppercase opacity-50 group-hover:opacity-100 transition-opacity duration-300 ${themeConfig.textDarkClass}`}>
                    Free / Gap • {block.durationMinutes}m ({toStandardTime(block.start_time)} - {toStandardTime(block.end_time)})
                  </span>
                </motion.div>
              );
            }

            // Active Event Block
            const subjectName = block.subject_name || '';
            const colorStyles = getSubjectColorStyles(subjectName, isCurrentlyActive);

            return (
              <motion.div
                key={block.id}
                variants={blockVariants}
                style={{ minHeight: `${blockHeight}px` }}
                onClick={() => onBlockClick(block)}
                className={`relative w-full mb-[1px] first:mb-0 flex flex-col justify-between p-4 border rounded-[22px] backdrop-blur-md group cursor-pointer transition-all duration-300 z-10 gap-3
                  ${themeConfig.cardClass}
                  ${colorStyles.border}
                  ${isCurrentlyActive ? `${colorStyles.glow} ${themeConfig.cardActiveBg}` : ''}
                `}
              >
                {/* Top Row: Title and Time Range */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-sans font-bold text-xs md:text-sm tracking-wide uppercase group-hover:${colorStyles.text} transition-colors duration-300 ${themeConfig.textBrightClass}`}>
                        {block.subject_name}
                      </h3>

                      {isCurrentlyActive && (
                        <span className="flex h-2 w-2 relative shrink-0">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colorStyles.dot} opacity-75`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${colorStyles.dot}`}></span>
                        </span>
                      )}

                      {conflicts[block.id] && conflicts[block.id].length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-1">
                          <span>⚠️ Overlaps with {conflicts[block.id].join(', ')}</span>
                        </span>
                      )}
                    </div>
                    {/* Tiny stats */}
                    <span className={`font-mono text-[9px] mt-0.5 ${themeConfig.textDarkClass}`}>
                      ID: {block.id} • DURATION: {block.durationMinutes} MIN
                    </span>
                  </div>

                  <div className={`flex items-center gap-1 font-mono text-[10px] md:text-[11px] border px-1.5 py-0.5 rounded-sm select-none self-start sm:self-auto shrink-0
                    ${themeConfig.name === 'dark' ? 'bg-matte-black/50 border-white/5' : 'bg-slate-900/5 border-slate-900/5'}
                  `}>
                    <Clock className={`w-3 h-3 ${themeConfig.textDarkClass}`} />
                    <span>{toStandardTime(block.start_time)}</span>
                    <span className={`font-sans ${themeConfig.textDarkClass}`}>→</span>
                    <span>{toStandardTime(block.end_time)}</span>
                  </div>
                </div>

                {/* Bottom Row: Metadata (Room & Instructor) */}
                <div className={`flex items-center gap-4 text-[10px] md:text-xs font-mono group-hover:text-text-muted transition-colors duration-300 flex-wrap ${themeConfig.textDarkClass}`}>
                  {block.room && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{block.room}</span>
                    </div>
                  )}
                  {block.instructor && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{block.instructor}</span>
                    </div>
                  )}
                </div>

                {/* Hover overlay indicator */}
                <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ChevronRight className={`w-4 h-4 ${colorStyles.text}`} />
                </div>
              </motion.div>
            );
          })}

          {/* Current Time Indicator Line */}
          {showCurrentTimeLine && (
            <motion.div
              className={`absolute left-0 right-0 h-[1.5px] pointer-events-none z-20 flex items-center justify-between ${themeConfig.indicatorLineClass}`}
              style={{ top: `${currentLineBottomPos}px` }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              {/* Left glow point */}
              <div className={`w-1.5 h-1.5 rounded-full -translate-x-[4px] ${themeConfig.indicatorDotClass}`} />
              
              {/* Floating current time badge */}
              <div className={`absolute right-4 transform -translate-y-1/2 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full tracking-wide uppercase select-none flex items-center gap-1 shadow-md ${themeConfig.indicatorBadgeClass}`}>
                <span className={`w-1 h-1 rounded-full animate-pulse ${themeConfig.name === 'dark' ? 'bg-matte-black' : 'bg-white'}`} />
                <span>NOW: {minutesToStandardTime(Math.floor(currentMinutes))}</span>
              </div>

              {/* Right glow point */}
              <div className={`w-1.5 h-1.5 rounded-full translate-x-[4px] ${themeConfig.indicatorDotClass}`} />
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
