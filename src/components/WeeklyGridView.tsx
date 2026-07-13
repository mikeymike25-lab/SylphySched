import React, { useMemo, useState } from 'react';
import { Clock, User, AlertTriangle, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import type { ScheduleItem, ThemeConfig } from '../types';
import { timeToMinutes, toStandardTime } from './AscendingTimeline';

interface WeeklyGridViewProps {
  schedule: Record<string, ScheduleItem[]>;
  themeConfig: ThemeConfig;
  onBlockClick: (block: any) => void;
  currentTime: Date;
  userName?: string | null;
}

// Helper to clean subject name for display / conflict checks
const cleanSubjectName = (name: string): string => {
  return name
    .replace(/\s*-\s*Lab$/i, '')
    .replace(/\s+Lab$/i, '')
    .trim();
};

// Helper to extract course code for short view (e.g. "IT 006 (Networking 1)" -> "IT 006")
const getShortSubjectName = (name: string): string => {
  const match = name.match(/^([A-Z]+\s+\d+)/i);
  return match ? match[1].toUpperCase() : name;
};

// Helper to format compact time ranges for inline labels (e.g., "7:30-8:30 AM")
const getCompactTimeRange = (start: string, end: string): string => {
  const s = toStandardTime(start).replace(/\s*[AP]M$/i, '').trim();
  const e = toStandardTime(end).trim();
  return `${s}-${e}`;
};

// Dynamically gets color styles matching the day view timeline blocks
const getSubjectColorStyles = (subjectName: string) => {
  const match = subjectName.match(/^([A-Z]+\s+\d+)/i);
  const code = match ? match[1].toUpperCase() : subjectName;

  switch (code) {
    case 'IT 006':
      return {
        border: 'border-l-2 border-l-cyan-400 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-cyan-400',
      };
    case 'IT 009':
      return {
        border: 'border-l-2 border-l-purple-400 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-purple-400',
      };
    case 'MATH 304':
      return {
        border: 'border-l-2 border-l-indigo-400 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-indigo-400',
      };
    case 'GEE 002':
      return {
        border: 'border-l-2 border-l-slate-300 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-slate-300',
      };
    case 'IT 003':
      return {
        border: 'border-l-2 border-l-lime-400 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-lime-400',
      };
    case 'IT 021':
      return {
        border: 'border-l-2 border-l-rose-400 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-rose-400',
      };
    case 'IT 005':
      return {
        border: 'border-l-2 border-l-emerald-400 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-emerald-400',
      };
    case 'TECH 101':
      return {
        border: 'border-l-2 border-l-amber-400 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-amber-400',
      };
    default:
      return {
        border: 'border-l-2 border-l-sky-400 border-t-white/10 border-r-white/10 border-b-white/10',
        text: 'text-sky-400',
      };
  }
};

interface PositionedCard {
  item: ScheduleItem;
  top: number; // percentage value
  height: number; // percentage value
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
  userName,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

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
  const totalMinutesRange = gridEndMin - gridStartMin;

  // Build hours list for left-hand scale
  const hoursList = useMemo(() => {
    const list = [];
    for (let h = minHour; h <= maxHour; h++) {
      list.push(h);
    }
    return list;
  }, [minHour, maxHour]);

  // Compute positioned cards for each day using overlap detection algorithm with percentage coordinates
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

      // Group into columns to render overlapping cards side-by-side
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
          
          // Compute positions as percentages relative to the total scale minutes
          const top = ((startMin - gridStartMin) / totalMinutesRange) * 100;
          const height = ((endMin - startMin) / totalMinutesRange) * 100;
          
          const colWidth = 100 / totalCols;
          const leftOffset = colIdx * colWidth;

          const hasConflict = !!(conflicts[item.id] && conflicts[item.id].length > 0);

          dayCards.push({
            item,
            top,
            height,
            width: `calc(${colWidth}% - 1px)`,
            left: `${leftOffset}%`,
            hasConflict,
            conflictingWith: conflicts[item.id]?.join(', '),
          });
        });
      });

      cards[day] = dayCards;
    });

    return cards;
  }, [schedule, activeDays, gridStartMin, totalMinutesRange]);

  // Live indicators for current time
  const currentDayOfWeek = useMemo(() => {
    return currentTime.toLocaleDateString('en-US', { weekday: 'long' });
  }, [currentTime]);

  const currentMinutes = useMemo(() => {
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  }, [currentTime]);

  const currentIndicatorTop = useMemo(() => {
    if (currentMinutes < gridStartMin || currentMinutes > gridEndMin) return null;
    return ((currentMinutes - gridStartMin) / totalMinutesRange) * 100;
  }, [currentMinutes, gridStartMin, gridEndMin, totalMinutesRange]);

  // Capture the schedule as a PNG file
  const handleDownloadImage = async () => {
    const captureArea   = document.getElementById('weekly-capture-area');
    const gridEl        = document.getElementById('weekly-schedule-grid');
    const titleBanner   = document.getElementById('weekly-title-banner');
    if (!captureArea || !gridEl) return;
    setIsDownloading(true);

    // Full content height = inner grid full scroll height + title banner height
    const gridScrollH   = gridEl.scrollHeight;
    const bannerH       = titleBanner ? titleBanner.offsetHeight : 0;
    const totalH        = gridScrollH + bannerH;
    const captureWidth  = 1200;
    const isDark        = themeConfig.name === 'dark';
    const SCALE         = 2.5;

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));

      const schedCanvas = await html2canvas(captureArea, {
        backgroundColor: isDark ? '#0a0a0c' : '#ffffff',
        scale: SCALE,
        logging: false,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: captureWidth,
        windowHeight: totalH,
        height: totalH,
        width: captureWidth,
        onclone: (clonedDoc) => {
          const clonedArea = clonedDoc.getElementById('weekly-capture-area');
          if (clonedArea) {
            // Force opaque solid background
            clonedArea.style.backgroundColor = isDark ? '#0a0a0c' : '#ffffff';
            clonedArea.style.backgroundImage = 'none';
            clonedArea.style.backdropFilter  = 'none';
            clonedArea.style.height          = `${totalH}px`;
            clonedArea.style.width           = `${captureWidth}px`;
            clonedArea.style.maxHeight       = 'none';
            clonedArea.style.maxWidth        = 'none';
            clonedArea.style.overflow        = 'visible';

            // Expand inner scrollable grid to its full content height
            const clonedGrid = clonedDoc.getElementById('weekly-schedule-grid');
            if (clonedGrid) {
              clonedGrid.style.overflow  = 'visible';
              clonedGrid.style.height    = `${gridScrollH}px`;
              clonedGrid.style.maxHeight = 'none';
            }

            // Expand inner grid wrapper (the min-w div)
            const innerGrid = clonedGrid?.querySelector('.min-w-\\[550px\\]') as HTMLElement | null;
            if (innerGrid) {
              innerGrid.style.height    = `${gridScrollH}px`;
              innerGrid.style.width     = `${captureWidth}px`;
              innerGrid.style.maxHeight = 'none';
              innerGrid.style.minHeight = 'none';
              innerGrid.style.minWidth  = 'none';
            }

            // Solidify cards — strip glass effects that break html2canvas
            clonedArea.querySelectorAll('.cursor-pointer').forEach((node) => {
              const card = node as HTMLElement;
              card.style.backgroundColor = isDark ? '#16161a' : '#f8fafc';
              card.style.backdropFilter  = 'none';
              card.style.boxShadow       = 'none';
            });

            // Hide live UI elements
            const timeLine  = clonedDoc.getElementById('current-time-line');
            if (timeLine)  timeLine.style.display  = 'none';
            const activeDot = clonedDoc.getElementById('today-indicator-dot');
            if (activeDot) activeDot.style.display = 'none';

            // Neutralise today-column header highlight
            const activeHeader = clonedArea.querySelector('.active-day-header') as HTMLElement;
            if (activeHeader) {
              activeHeader.style.color      = isDark ? '#e2e8f0' : '#0f172a';
              activeHeader.style.background = 'none';
            }

            // Remove today column background tint
            clonedArea.querySelectorAll('.today-col-highlight').forEach((node) => {
              (node as HTMLElement).style.backgroundColor = 'transparent';
            });
          }
        },
        // Exclude the download button AND the DOM watermark strip (watermark drawn by Canvas 2D instead)
        ignoreElements: (el) =>
          el.id === 'download-button-wrapper' || el.id === 'weekly-dom-watermark',
      });

      // ── Post-process: draw a watermark footer bar directly on the canvas ──
      const BAR_H = Math.round(40 * SCALE);   // 40 logical px tall footer
      const PAD   = Math.round(16 * SCALE);   // horizontal padding

      // Create a taller final canvas that includes the schedule + watermark bar
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width  = schedCanvas.width;
      finalCanvas.height = schedCanvas.height + BAR_H;

      const ctx = finalCanvas.getContext('2d')!;

      // Draw the schedule image on top
      ctx.drawImage(schedCanvas, 0, 0);

      // Draw watermark bar background
      const barY = schedCanvas.height;
      ctx.fillStyle = isDark ? '#0a0a0c' : '#f1f5f9';
      ctx.fillRect(0, barY, finalCanvas.width, BAR_H);

      // Thin separator line
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, barY, finalCanvas.width, Math.round(1 * SCALE));

      // Draw logo image (load from public folder)
      const logoSrc = isDark ? '/LogoBluelight.png' : '/LogoBlack.png';
      await new Promise<void>((resolve) => {
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        logo.onload = () => {
          const LOGO_SIZE = Math.round(18 * SCALE);
          const logoX = PAD;
          const logoY = barY + Math.round((BAR_H - LOGO_SIZE) / 2);
          ctx.drawImage(logo, logoX, logoY, LOGO_SIZE, LOGO_SIZE);
          resolve();
        };
        logo.onerror = () => resolve(); // skip logo if it fails, still draw text
        logo.src = logoSrc;
      });

      // Draw "SylphySched" brand text
      const FONT_SIZE = Math.round(11 * SCALE);
      ctx.font = `800 ${FONT_SIZE}px 'Inter', 'Segoe UI', monospace`;
      ctx.letterSpacing = `${Math.round(3 * SCALE)}px`;
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.45)';
      const textX = PAD + Math.round(22 * SCALE); // after logo + gap
      const textY = barY + Math.round((BAR_H + FONT_SIZE * 0.72) / 2);
      ctx.fillText('SYLPHYSCHED', textX, textY);

      // Right-aligned subtle tagline
      const TAG_SIZE = Math.round(8.5 * SCALE);
      ctx.font = `400 ${TAG_SIZE}px 'Inter', 'Segoe UI', monospace`;
      ctx.letterSpacing = `${Math.round(1 * SCALE)}px`;
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.2)';
      const tag = 'Your Smart Class Companion';
      const tagW = ctx.measureText(tag).width;
      ctx.fillText(tag, finalCanvas.width - PAD - tagW, textY);

      // Export
      const imgUrl = finalCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      const sanitizedUser = userName ? userName.replace(/[^a-zA-Z0-9]/g, '_') : 'my';
      link.download = `${sanitizedUser}_weekly_schedule.png`;
      link.href = imgUrl;
      link.click();
    } catch (err: any) {
      console.error('Failed to capture weekly schedule:', err);
      alert('Download failed: ' + (err?.message || err));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-3 md:p-6 select-none bg-transparent">
      {/* View Header */}
      <div className={`mb-3 md:mb-5 flex justify-between items-end border-b pb-3 shrink-0 ${themeConfig.borderClass}`}>
        <div>
          <span className={`text-[9px] uppercase tracking-[0.2em] font-mono ${themeConfig.textDarkClass}`}>
            Matrix View
          </span>
          <h1 className={`text-base md:text-xl font-bold tracking-tight mt-0.5 md:mt-1 ${themeConfig.textBrightClass}`}>
            Weekly Schedule Overview
          </h1>
        </div>
        
        {/* Download Schedule Button */}
        <div id="download-button-wrapper" className="shrink-0 z-20">
          <button
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className={`px-3 py-1.5 md:px-4 md:py-2 text-[9px] md:text-xs font-mono tracking-wider rounded-full cursor-pointer transition-all duration-300 flex items-center gap-1.5 border shadow-sm select-none active:scale-[0.97]
              ${themeConfig.name === 'dark' 
                ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-cyber-cyan' 
                : 'bg-slate-900 text-white border-slate-900/10 hover:bg-slate-800'
              }
              ${isDownloading && 'opacity-65 cursor-not-allowed'}
            `}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>EXPORTING...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD SCHED</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Capture wrapper — title banner + scrollable grid captured together as one PNG */}
      <div id="weekly-capture-area" className="flex-1 min-h-0 flex flex-col overflow-hidden">

        {/* Title banner — sits ABOVE the scroll container so sticky day headers never overlap it */}
        <div id="weekly-title-banner" className={`w-full py-3 px-5 border border-white/5 rounded-t-[20px] md:rounded-t-[24px] flex justify-between items-center bg-matte-black/40 shrink-0 ${themeConfig.borderClass}`}>
          <div className="flex flex-col">
            <span className={`text-[7.5px] uppercase tracking-[0.2em] font-mono ${themeConfig.textDarkClass}`}>
              SylphySched Matrix
            </span>
            <h2 className={`text-xs md:text-sm font-extrabold tracking-tight mt-0.5 ${themeConfig.textBrightClass}`}>
              {userName ? `${userName}'s Weekly Schedule` : 'Weekly Class Schedule'}
            </h2>
          </div>
          <div className={`font-mono text-[8px] tracking-wider ${themeConfig.textDarkClass}`}>
            MON - {activeDays[activeDays.length - 1].slice(0, 3).toUpperCase()}
          </div>
        </div>

        {/* Main Grid Area */}
        <div
          id="weekly-schedule-grid"
          className="flex-1 min-h-0 flex flex-col overflow-auto border-x border-b border-white/5 rounded-b-[20px] md:rounded-b-[24px] bg-matte-black/25 backdrop-blur-md relative scrollbar-none"
        >
        {/* Scale constraints */}
        <div className="min-w-[550px] md:min-w-0 w-full min-h-[650px] md:min-h-[750px] flex-1 flex flex-col relative p-1 md:p-3">
          
          {/* Day Columns Header Row */}
          <div className={`sticky top-0 z-30 flex w-full border-b backdrop-blur-xl bg-matte-black/60 shrink-0 ${themeConfig.borderClass}`}>
            {/* Hour Scale Spacer */}
            <div className={`w-10 md:w-16 shrink-0 border-r flex items-center justify-center font-mono text-[8px] md:text-[9px] uppercase tracking-wider ${themeConfig.borderClass} ${themeConfig.textDarkClass}`}>
              Time
            </div>
            
            {/* Days Columns headers */}
            {activeDays.map((day) => {
              const isToday = day === currentDayOfWeek;
              return (
                <div
                  key={day}
                  className={`flex-1 py-1.5 md:py-2.5 text-center border-r font-sans text-[10px] md:text-xs font-bold tracking-wide select-none flex flex-col items-center justify-center gap-0.5 last:border-r-0
                    ${themeConfig.borderClass}
                    ${isToday ? `${themeConfig.accentTextClass} active-day-header` : themeConfig.textBrightClass}
                  `}
                >
                  <span className="uppercase text-[9px] md:text-[10px] tracking-widest">{day.slice(0, 3)}</span>
                  {isToday && (
                    <span id="today-indicator-dot" className={`w-1 h-1 rounded-full mt-0.5 ${themeConfig.accentDotClass}`}></span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Main Grid Columns with Gridlines & Percentage scale heights */}
          <div className="flex-1 flex relative w-full min-h-0 overflow-hidden">
            {/* Left Hour Scale Column */}
            <div className={`w-10 md:w-16 shrink-0 border-r relative font-mono text-[8px] md:text-[9.5px] ${themeConfig.borderClass} ${themeConfig.textDarkClass}`}>
              {hoursList.map((hour) => {
                const hourMinutes = hour * 60;
                const topPercent = ((hourMinutes - gridStartMin) / totalMinutesRange) * 100;
                
                // Format standard 12-hour
                const ampm = hour >= 12 ? 'PM' : 'AM';
                let formattedHour = hour % 12;
                formattedHour = formattedHour ? formattedHour : 12;

                return (
                  <div
                    key={`label-${hour}`}
                    className="absolute right-1.5 md:right-3 transform -translate-y-1/2 select-none whitespace-nowrap"
                    style={{ top: `${topPercent}%` }}
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
                    ${isToday ? 'bg-white/[0.015] today-col-highlight' : ''}
                  `}
                >
                  {/* Background grid lines for hours using percentage positioning */}
                  {hoursList.map((hour) => {
                    const hourMinutes = hour * 60;
                    const topPercent = ((hourMinutes - gridStartMin) / totalMinutesRange) * 100;
                    return (
                      <div
                        key={`gridline-${day}-${hour}`}
                        className={`absolute left-0 right-0 border-b pointer-events-none z-0 ${themeConfig.name === 'dark' ? 'border-white/[0.03]' : 'border-slate-900/[0.04]'}`}
                        style={{ top: `${topPercent}%` }}
                      />
                    );
                  })}

                  {/* Render Day Cards absolutely positioned in percentages */}
                  {cards.map(({ item, top, height, width, left, hasConflict, conflictingWith }) => {
                    const colors = getSubjectColorStyles(item.subject_name);
                    // isShort: < ~8% height means very cramped (≈ 1hr or less on a long day range)
                    const isShort = height < 9;
                    // isMedium: 9–16% — show subject + time + room but compact footer
                    const isMedium = height >= 9 && height < 16;
                    const shortName = getShortSubjectName(item.subject_name);

                    return (
                      <div
                        key={`card-${item.id}`}
                        onClick={() => onBlockClick(item)}
                        style={{
                          top: `${top}%`,
                          height: `calc(${height}% - 2px)`,
                          width,
                          left,
                        }}
                        className={`absolute rounded-[10px] md:rounded-[12px] backdrop-blur-md flex flex-col cursor-pointer select-none transition-all duration-300 hover:scale-[1.01] hover:shadow-md z-10 border border-white/5 hover:brightness-105 active:scale-[0.99]
                          ${themeConfig.cardClass}
                          ${colors.border}
                          ${isShort ? 'p-1 py-0.5 justify-center' : 'p-2 md:p-2.5 justify-between'}
                        `}
                      >
                        {/* ── SHORT CARD (very small block) ── */}
                        {isShort && (
                          <div className="flex flex-col gap-[2px] overflow-hidden w-full">
                            {/* Subject code + time on one line */}
                            <span className={`font-sans font-extrabold text-[8.5px] md:text-[10px] uppercase tracking-wide leading-tight truncate ${colors.text}`}>
                              {shortName}
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className={`font-mono text-[7px] md:text-[8.5px] leading-tight ${themeConfig.textDarkClass}`}>
                                {getCompactTimeRange(item.start_time, item.end_time)}
                              </span>
                              {item.room && (
                                <span className={`font-mono text-[7px] md:text-[8px] uppercase opacity-60 leading-tight truncate ${themeConfig.textDarkClass}`}>
                                  · {item.room}
                                </span>
                              )}
                            </div>
                            {hasConflict && <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />}
                          </div>
                        )}

                        {/* ── MEDIUM / LARGE CARD ── */}
                        {!isShort && (
                          <>
                            {/* Top: subject name + conflict icon */}
                            <div className="flex flex-col gap-0.5 overflow-hidden w-full">
                              <div className="flex items-start justify-between gap-1 w-full">
                                <span className={`font-sans font-extrabold text-[9px] md:text-[11px] uppercase tracking-wide leading-snug text-left transition-colors ${colors.text}`}>
                                  {item.subject_name}
                                </span>
                                {hasConflict && (
                                  <span title={`Conflict with ${conflictingWith}`}>
                                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                                  </span>
                                )}
                              </div>

                              {/* Room — always shown on medium+ cards */}
                              <span className={`font-mono text-[7px] md:text-[8.5px] tracking-wider uppercase opacity-70 text-left ${themeConfig.textDarkClass}`}>
                                {item.room || 'Room TBD'}
                              </span>
                            </div>

                            {/* Footer: time + instructor */}
                            <div className="flex flex-col gap-0.5 border-t border-white/5 pt-1 mt-1 text-left">
                              {/* Time — bigger and always visible */}
                              <div className={`flex items-center gap-1 font-mono text-[7.5px] md:text-[9px] font-semibold ${themeConfig.textDarkClass}`}>
                                <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 shrink-0" />
                                <span>{toStandardTime(item.start_time)} – {toStandardTime(item.end_time)}</span>
                              </div>

                              {/* Instructor — show on medium if room; always on large */}
                              {item.instructor && item.instructor !== 'TBA' && !isMedium && (
                                <div className={`flex items-center gap-1 font-mono text-[7px] md:text-[8.5px] opacity-75 ${themeConfig.textDarkClass}`}>
                                  <User className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{item.instructor}</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Horizontal indicator for current time (Today Column only) using percentage coordinates */}
                  {isToday && currentIndicatorTop !== null && (
                    <div
                      id="current-time-line"
                      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                      style={{ top: `${currentIndicatorTop}%` }}
                    >
                      {/* glowing dot on left */}
                      <span className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] -ml-[3px] md:-ml-[5px] shrink-0"></span>
                      <span className="flex-1 h-[1.5px] bg-gradient-to-r from-rose-500 via-rose-500/40 to-transparent"></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>{/* end inner grid wrapper */}
        </div>{/* end #weekly-schedule-grid */}

        {/* Watermark strip — excluded from html2canvas via id, watermark is drawn by Canvas 2D API */}
        <div id="weekly-dom-watermark" className="relative flex items-center justify-center gap-1.5 py-1.5 opacity-20 pointer-events-none select-none shrink-0">
          <img
            src={themeConfig.name === 'light' ? '/LogoBlack.png' : '/LogoBluelight.png'}
            className="w-3 h-3 object-contain"
            alt="Logo"
          />
          <span className={`font-mono text-[8px] uppercase tracking-[0.2em] font-extrabold ${themeConfig.textBrightClass}`}>
            SylphySched
          </span>
        </div>
      </div>{/* end #weekly-capture-area */}
    </div>
  );
};
