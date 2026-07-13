import React, { useMemo } from 'react';
import { Clock, User, AlertTriangle } from 'lucide-react';
import type { ScheduleItem, ThemeConfig } from '../types';
import { timeToMinutes, toStandardTime } from './AscendingTimeline';

interface WeeklyGridViewProps {
  schedule: Record<string, ScheduleItem[]>;
  themeConfig: ThemeConfig;
  onBlockClick: (block: any) => void;
  currentTime: Date;
}



// Helper to clean subject name for display / conflict checks
const cleanSubjectName = (name: string): string => {
  return name
    .replace(/\s*-\s*Lab$/i, '')
    .replace(/\s+Lab$/i, '')
    .trim();
};

// Dynamically gets color styles matching the design system
const getSubjectColorStyles = (subjectName: string) => {
  const match = subjectName.match(/^([A-Z]+\s+\d+)/i);
  const code = match ? match[1].toUpperCase() : subjectName;

  switch (code) {
    case 'IT 006':
      return {
        card: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/20',
      };
    case 'IT 009':
      return {
        card: 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
      };
    case 'MATH 304':
      return {
        card: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/50',
        badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/20',
      };
    case 'GEE 002':
      return {
        card: 'border-slate-400/30 bg-slate-400/10 text-slate-300 hover:bg-slate-400/20 hover:border-slate-400/50',
        badge: 'bg-slate-400/20 text-slate-300 border-slate-400/20',
      };
    case 'IT 003':
      return {
        card: 'border-lime-500/30 bg-lime-500/10 text-lime-400 hover:bg-lime-500/20 hover:border-lime-500/50',
        badge: 'bg-lime-500/20 text-lime-300 border-lime-500/20',
      };
    case 'IT 021':
      return {
        card: 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/20',
      };
    case 'IT 005':
      return {
        card: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
      };
    case 'TECH 101':
      return {
        card: 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/20',
      };
    default:
      return {
        card: 'border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 hover:border-sky-500/50',
        badge: 'bg-sky-500/20 text-sky-300 border-sky-500/20',
      };
  }
};

interface PositionedCard {
  item: ScheduleItem;
  top: number;
  height: number;
  left: string;
  width: string;
  hasConflict: boolean;
  conflictingWith?: string;
}

export const WeeklyGridView: React.FC<WeeklyGridViewProps> = ({
  schedule,
  themeConfig,
  onBlockClick,
  currentTime,
}) => {
  // Scale factor: 1 minute = 1.35 pixels
  const pxPerMinute = 1.35;

  // Determine active columns (Monday to Friday, add Sat/Sun if there are scheduled classes)
  const activeDays = useMemo(() => {
    const defaultDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const weekends = ['Saturday', 'Sunday'];
    weekends.forEach((day) => {
      if ((schedule[day] || []).length > 0) {
        defaultDays.push(day);
      }
    });
    return defaultDays;
  }, [schedule]);

  // Determine boundary hours (min hour and max hour across all active days)
  const gridBoundaries = useMemo(() => {
    let minMinutes = 480; // Default 08:00
    let maxMinutes = 1080; // Default 18:00

    let hasItems = false;
    Object.entries(schedule).forEach(([day, items]) => {
      if (!activeDays.includes(day)) return;
      items.forEach((item) => {
        hasItems = true;
        const start = timeToMinutes(item.start_time);
        const end = timeToMinutes(item.end_time);
        if (start < minMinutes) minMinutes = start;
        if (end > maxMinutes) maxMinutes = end;
      });
    });

    if (hasItems) {
      // Pad to nearest hours
      const minHour = Math.max(0, Math.floor(minMinutes / 60) - 1);
      const maxHour = Math.min(24, Math.ceil(maxMinutes / 60) + 1);
      return { minHour, maxHour };
    }

    return { minHour: 8, maxHour: 18 };
  }, [schedule, activeDays]);

  const { minHour, maxHour } = gridBoundaries;
  const gridStartMin = minHour * 60;
  const gridEndMin = maxHour * 60;
  const totalHeight = (gridEndMin - gridStartMin) * pxPerMinute;

  // Build hours list for left-hand scale
  const hoursList = useMemo(() => {
    const list = [];
    for (let h = minHour; h <= maxHour; h++) {
      list.push(h);
    }
    return list;
  }, [minHour, maxHour]);

  // Compute positioned cards for each day using overlap detection algorithm
  const positionedCardsByDay = useMemo(() => {
    const cards: Record<string, PositionedCard[]> = {};

    activeDays.forEach((day) => {
      const items = schedule[day] || [];
      // Sort chronologically
      const sorted = [...items].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
      
      // Calculate overlapping conflicts
      const conflicts: Record<string, string[]> = {};
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a = sorted[i];
          const b = sorted[j];
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

      // Group into visual columns to render overlapping cards side-by-side
      const columns: ScheduleItem[][] = [];
      sorted.forEach((item) => {
        let placed = false;
        const itemStart = timeToMinutes(item.start_time);

        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const lastInCol = col[col.length - 1];
          if (timeToMinutes(lastInCol.end_time) <= itemStart) {
            col.push(item);
            placed = true;
            break;
          }
        }
        if (!placed) {
          columns.push([item]);
        }
      });

      const dayCards: PositionedCard[] = [];
      const totalCols = columns.length;

      columns.forEach((col, colIdx) => {
        col.forEach((item) => {
          const startMin = timeToMinutes(item.start_time);
          const endMin = timeToMinutes(item.end_time);
          const top = (startMin - gridStartMin) * pxPerMinute;
          const height = (endMin - startMin) * pxPerMinute;
          
          const colWidth = 100 / totalCols;
          const leftOffset = colIdx * colWidth;

          const hasConflict = !!(conflicts[item.id] && conflicts[item.id].length > 0);

          dayCards.push({
            item,
            top,
            height,
            width: `calc(${colWidth}% - 2px)`,
            left: `calc(${leftOffset}% + 1px)`,
            hasConflict,
            conflictingWith: conflicts[item.id]?.join(', '),
          });
        });
      });

      cards[day] = dayCards;
    });

    return cards;
  }, [schedule, activeDays, gridStartMin, pxPerMinute]);

  // Live indicators for current time
  const currentDayOfWeek = useMemo(() => {
    return currentTime.toLocaleDateString('en-US', { weekday: 'long' });
  }, [currentTime]);

  const currentMinutes = useMemo(() => {
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  }, [currentTime]);

  const currentIndicatorTop = useMemo(() => {
    if (currentMinutes < gridStartMin || currentMinutes > gridEndMin) return null;
    return (currentMinutes - gridStartMin) * pxPerMinute;
  }, [currentMinutes, gridStartMin, gridEndMin, pxPerMinute]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-6 select-none bg-transparent">
      {/* View Header */}
      <div className={`mb-6 flex justify-between items-end border-b pb-4 shrink-0 ${themeConfig.borderClass}`}>
        <div>
          <span className={`text-[10px] uppercase tracking-[0.2em] font-mono ${themeConfig.textDarkClass}`}>
            Grid Matrix
          </span>
          <h1 className={`text-xl font-bold tracking-tight mt-1 ${themeConfig.textBrightClass}`}>
            Weekly Schedule Overview
          </h1>
        </div>
        <div className={`font-mono text-xs uppercase tracking-wider ${themeConfig.textDarkClass}`}>
          Columns: {activeDays.length} Days • Scale: {pxPerMinute.toFixed(2)}px/m
        </div>
      </div>

      {/* Main Grid Area - Horizontally scrollable container for responsiveness */}
      <div className="flex-1 overflow-x-auto overflow-y-auto border border-white/5 rounded-[24px] bg-matte-black/25 backdrop-blur-md relative scrollbar-none">
        <div className="min-w-[850px] flex flex-col relative" style={{ height: `${totalHeight + 50}px` }}>
          
          {/* Day Columns Header Row */}
          <div className={`sticky top-0 z-30 flex w-full border-b backdrop-blur-xl bg-matte-black/60 shrink-0 ${themeConfig.borderClass}`}>
            {/* Hour Scale Spacer */}
            <div className={`w-16 shrink-0 border-r flex items-center justify-center font-mono text-[9px] uppercase tracking-wider ${themeConfig.borderClass} ${themeConfig.textDarkClass}`}>
              Time
            </div>
            
            {/* Days Columns headers */}
            {activeDays.map((day) => {
              const isToday = day === currentDayOfWeek;
              return (
                <div
                  key={day}
                  className={`flex-1 py-3 text-center border-r font-sans text-xs font-bold tracking-wide select-none flex flex-col items-center justify-center gap-0.5 last:border-r-0
                    ${themeConfig.borderClass}
                    ${isToday ? themeConfig.accentTextClass : themeConfig.textBrightClass}
                  `}
                >
                  <span className="uppercase text-[10px] tracking-widest">{day.slice(0, 3)}</span>
                  <span className={`font-mono text-[8px] tracking-wider opacity-60 ${isToday && 'font-bold opacity-100'}`}>
                    {day.toUpperCase()}
                  </span>
                  {isToday && (
                    <span className={`w-1 h-1 rounded-full mt-1 ${themeConfig.accentDotClass}`}></span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Main Grid Columns with Gridlines */}
          <div className="flex-1 flex relative w-full h-full">
            {/* Left Hour Scale Column */}
            <div className={`w-16 shrink-0 border-r relative font-mono text-[10px] ${themeConfig.borderClass} ${themeConfig.textDarkClass}`}>
              {hoursList.map((hour) => {
                const hourMinutes = hour * 60;
                const topPos = (hourMinutes - gridStartMin) * pxPerMinute;
                
                // Format standard 12-hour
                const ampm = hour >= 12 ? 'PM' : 'AM';
                let formattedHour = hour % 12;
                formattedHour = formattedHour ? formattedHour : 12;

                return (
                  <div
                    key={`label-${hour}`}
                    className="absolute right-3 transform -translate-y-1/2 select-none"
                    style={{ top: `${topPos}px` }}
                  >
                    {formattedHour}:00 {ampm}
                  </div>
                );
              })}
            </div>

            {/* Day columns */}
            {activeDays.map((day) => {
              const isToday = day === currentDayOfWeek;
              const cards = positionedCardsByDay[day] || [];

              return (
                <div
                  key={`col-${day}`}
                  className={`flex-1 border-r relative h-full group last:border-r-0 ${themeConfig.borderClass}
                    ${isToday ? 'bg-white/[0.015]' : ''}
                  `}
                >
                  {/* Background grid lines for hours */}
                  {hoursList.map((hour) => {
                    const hourMinutes = hour * 60;
                    const topPos = (hourMinutes - gridStartMin) * pxPerMinute;
                    return (
                      <div
                        key={`gridline-${day}-${hour}`}
                        className={`absolute left-0 right-0 border-b pointer-events-none z-0 ${themeConfig.name === 'dark' ? 'border-white/[0.03]' : 'border-slate-900/[0.04]'}`}
                        style={{ top: `${topPos}px` }}
                      />
                    );
                  })}

                  {/* Render Day Cards */}
                  {cards.map(({ item, top, height, width, left, hasConflict, conflictingWith }) => {
                    const colors = getSubjectColorStyles(item.subject_name);
                    
                    return (
                      <div
                        key={`card-${item.id}`}
                        onClick={() => onBlockClick(item)}
                        style={{ top: `${top}px`, height: `${height}px`, width, left }}
                        className={`absolute p-2.5 rounded-[16px] border flex flex-col justify-between cursor-pointer select-none transition-all duration-300 hover:scale-[1.01] hover:shadow-md z-10 backdrop-blur-sm group
                          ${colors.card}
                        `}
                      >
                        {/* Title block */}
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-sans font-extrabold text-[9.5px] uppercase tracking-wide leading-tight line-clamp-2">
                              {item.subject_name}
                            </span>
                            {hasConflict && (
                              <span className="shrink-0 mt-0.5" title={`Time Conflict: Overlaps with ${conflictingWith}`}>
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                              </span>
                            )}
                          </div>
                          
                          {/* Duration / ID */}
                          <span className="font-mono text-[7px] tracking-wider opacity-60 uppercase">
                            {item.room || 'TBD'}
                          </span>
                        </div>

                        {/* Card footer details (hide if card is too short) */}
                        {height > 55 && (
                          <div className="flex flex-col gap-0.5 border-t border-white/5 pt-1 mt-1 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="flex items-center gap-1 font-mono text-[7.5px]">
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{toStandardTime(item.start_time)} - {toStandardTime(item.end_time)}</span>
                            </div>
                            {item.instructor && item.instructor !== 'TBA' && height > 75 && (
                              <div className="flex items-center gap-1 font-mono text-[7.5px] truncate">
                                <User className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{item.instructor}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Horizontal indicator for current time (Today Column only) */}
                  {isToday && currentIndicatorTop !== null && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                      style={{ top: `${currentIndicatorTop}px` }}
                    >
                      {/* glowing dot on left */}
                      <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] -ml-1 shrink-0"></span>
                      <span className="flex-1 h-[1.5px] bg-gradient-to-r from-rose-500 via-rose-500/40 to-transparent"></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};
