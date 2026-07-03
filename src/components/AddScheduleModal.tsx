import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Sparkles, Calendar, Clock, MapPin, User, Trash2, Edit3, Check, Loader2 } from 'lucide-react';
import type { ThemeConfig } from '../types';
import {
  parseRawScheduleTextOffline,
  parseRawScheduleTextWithGemini,
  type ParsedScheduleItem
} from '../utils/scheduleParser';

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeConfig: ThemeConfig;
  onAddSingle: (item: any) => void;
  onAddMultiple: (items: any[]) => void;
  addToast: (
    type: 'start' | 'end' | 'system',
    title: string,
    message: string,
    subjectName: string
  ) => void;
  defaultTab?: 'manual' | 'import';
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const AddScheduleModal: React.FC<AddScheduleModalProps> = ({
  isOpen,
  onClose,
  themeConfig,
  onAddSingle,
  onAddMultiple,
  addToast,
  defaultTab,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');

  React.useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Manual Form State
  const [subjectName, setSubjectName] = useState('');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [room, setRoom] = useState('');
  const [instructor, setInstructor] = useState('');

  // Import State
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<(ParsedScheduleItem & { tempId: string })[]>([]);
  
  // Inline edit state for parsed items preview
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editDay, setEditDay] = useState<ParsedScheduleItem['day']>('Monday');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editInstructor, setEditInstructor] = useState('');

  const hasApiKey = !!import.meta.env.VITE_GEMINI_API_KEY;

  const resetManualForm = () => {
    setSubjectName('');
    setSelectedDay('Monday');
    setStartTime('08:00');
    setEndTime('09:00');
    setRoom('');
    setInstructor('');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      addToast('system', 'Validation Error', 'Subject name is required.', 'SYSTEM');
      return;
    }

    const newItem = {
      id: Math.random().toString(36).substring(2, 9),
      day: selectedDay,
      subject_name: subjectName.trim(),
      start_time: startTime,
      end_time: endTime,
      room: room.trim() || 'TBD',
      instructor: instructor.trim() || 'TBA',
    };

    onAddSingle(newItem);
    addToast('start', 'Class Added', `"${newItem.subject_name}" has been added to ${newItem.day}.`, newItem.subject_name);
    resetManualForm();
    onClose();
  };

  const handleExtractText = async (useAi: boolean) => {
    if (!rawText.trim()) {
      addToast('system', 'Validation Error', 'Please paste some schedule text first.', 'SYSTEM');
      return;
    }

    setIsParsing(true);
    try {
      let results: ParsedScheduleItem[] = [];
      if (useAi) {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        results = await parseRawScheduleTextWithGemini(rawText, apiKey);
      } else {
        results = parseRawScheduleTextOffline(rawText);
      }

      const resultsWithIds = results.map(item => ({
        ...item,
        tempId: Math.random().toString(36).substring(2, 9)
      }));

      setParsedItems(resultsWithIds);
      addToast('system', 'Extraction Complete', `Found ${results.length} schedule entries.`, 'SYSTEM');
    } catch (e: any) {
      console.error('Extraction failed:', e);
      addToast('system', 'Parsing Error', e.message || 'Failed to extract schedule items.', 'SYSTEM');
    } finally {
      setIsParsing(false);
    }
  };

  const handleStartEdit = (item: ParsedScheduleItem & { tempId: string }) => {
    setEditingTempId(item.tempId);
    setEditSubject(item.subject_name);
    setEditDay(item.day);
    setEditStart(item.start_time);
    setEditEnd(item.end_time);
    setEditRoom(item.room);
    setEditInstructor(item.instructor);
  };

  const handleSaveEdit = (tempId: string) => {
    setParsedItems(prev => prev.map(item => {
      if (item.tempId === tempId) {
        return {
          ...item,
          subject_name: editSubject,
          day: editDay,
          start_time: editStart,
          end_time: editEnd,
          room: editRoom,
          instructor: editInstructor
        };
      }
      return item;
    }));
    setEditingTempId(null);
  };

  const handleDeleteItem = (tempId: string) => {
    setParsedItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleImportAll = () => {
    if (parsedItems.length === 0) return;
    
    const formattedItems = parsedItems.map(item => ({
      id: Math.random().toString(36).substring(2, 9),
      day: item.day,
      subject_name: item.subject_name,
      start_time: item.start_time,
      end_time: item.end_time,
      room: item.room,
      instructor: item.instructor
    }));

    onAddMultiple(formattedItems);
    addToast('system', 'Import Success', `Successfully imported ${formattedItems.length} classes into your schedule.`, 'SYSTEM');
    setParsedItems([]);
    setRawText('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-matte-black/60 backdrop-blur-sm pointer-events-auto"
          />

          {/* Add Schedule Slide-over Panel (Liquid Glass iOS style) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 130, damping: 20 }}
            className={`fixed inset-y-0 right-0 z-45 w-full sm:w-[500px] h-full shadow-[0_0_50px_rgba(0,0,0,0.8)] border-l backdrop-blur-2xl p-6 flex flex-col justify-between select-none pointer-events-auto transition-colors duration-500
              ${themeConfig.name === 'dark' ? 'bg-[#0f0f11]/80 border-white/10' : 'bg-white/85 border-slate-900/10'}
            `}
          >
            {/* Header */}
            <div className={`flex flex-col gap-1 border-b pb-4 mb-4 shrink-0 ${themeConfig.borderClass}`}>
              <div className="flex items-center justify-between">
                <span className={`font-mono text-[10px] tracking-[0.2em] font-bold ${themeConfig.accentTextClass}`}>
                  Schedule Importer
                </span>
                <button
                  onClick={onClose}
                  className={`p-1.5 rounded-full hover:bg-white/[0.04] transition-all cursor-pointer ${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <Plus className={`w-4 h-4 ${themeConfig.accentTextClass}`} />
                <h2 className={`text-base font-bold uppercase truncate ${themeConfig.textBrightClass}`}>
                  Add Class Block
                </h2>
              </div>
            </div>

            {/* Tab Toggle buttons */}
            <div className={`grid grid-cols-2 gap-1.5 p-1 border rounded-full select-none mb-5 shrink-0
              ${themeConfig.name === 'dark' ? 'bg-matte-black/40 border-white/5' : 'bg-slate-900/5 border-slate-900/10'}
            `}>
              <button
                onClick={() => setActiveTab('manual')}
                className={`py-1.5 text-[9px] font-mono tracking-wider rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center gap-1.5
                  ${activeTab === 'manual'
                    ? `${themeConfig.name === 'dark' ? 'bg-white/[0.08] text-cyber-cyan font-bold border border-white/10 shadow-[0_0_8px_rgba(0,229,255,0.15)]' : 'bg-slate-900 text-white font-bold border border-slate-900/10'}`
                    : `${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass} hover:bg-white/[0.04]`
                  }
                `}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>MANUAL ENTRY</span>
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`py-1.5 text-[9px] font-mono tracking-wider rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center gap-1.5
                  ${activeTab === 'import'
                    ? `${themeConfig.name === 'dark' ? 'bg-white/[0.08] text-cyber-cyan font-bold border border-white/10 shadow-[0_0_8px_rgba(0,229,255,0.15)]' : 'bg-slate-900 text-white font-bold border border-slate-900/10'}`
                    : `${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass} hover:bg-white/[0.04]`
                  }
                `}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>IMPORT FROM TEXT</span>
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1 scrollbar-thin">
              {activeTab === 'manual' ? (
                /* MANUAL ENTRY FORM */
                <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={`font-mono text-[9px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>Subject Name</label>
                    <input
                      type="text"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="e.g. IT 006 (Networking 1)"
                      className={`px-4 py-2.5 rounded-[16px] text-xs font-sans border backdrop-blur-md transition-all duration-300 outline-none
                        ${themeConfig.name === 'dark' 
                          ? 'bg-matte-black/50 border-white/10 focus:border-cyan-500/50 text-white placeholder-white/20' 
                          : 'bg-slate-900/[0.02] border-slate-900/10 focus:border-slate-900/30 text-slate-900 placeholder-slate-400'
                        }
                      `}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className={`font-mono text-[9px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>Day of Week</label>
                      <select
                        value={selectedDay}
                        onChange={(e) => setSelectedDay(e.target.value)}
                        className={`px-4 py-2.5 rounded-[16px] text-xs font-sans border backdrop-blur-md transition-all duration-300 outline-none cursor-pointer
                          ${themeConfig.name === 'dark' 
                            ? 'bg-[#0f0f11] border-white/10 text-white focus:border-cyan-500/50' 
                            : 'bg-white border-slate-900/10 text-slate-900 focus:border-slate-900/30'
                          }
                        `}
                      >
                        {DAYS_OF_WEEK.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={`font-mono text-[9px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>Room</label>
                      <input
                        type="text"
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                        placeholder="e.g. Room Q-5217C"
                        className={`px-4 py-2.5 rounded-[16px] text-xs font-sans border backdrop-blur-md transition-all duration-300 outline-none
                          ${themeConfig.name === 'dark' 
                            ? 'bg-matte-black/50 border-white/10 focus:border-cyan-500/50 text-white placeholder-white/20' 
                            : 'bg-slate-900/[0.02] border-slate-900/10 focus:border-slate-900/30 text-slate-900 placeholder-slate-400'
                          }
                        `}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className={`font-mono text-[9px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>Start Time</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className={`px-4 py-2.5 rounded-[16px] text-xs font-sans border backdrop-blur-md transition-all duration-300 outline-none
                          ${themeConfig.name === 'dark' 
                            ? 'bg-matte-black/50 border-white/10 focus:border-cyan-500/50 text-white' 
                            : 'bg-slate-900/[0.02] border-slate-900/10 focus:border-slate-900/30 text-slate-900'
                          }
                        `}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={`font-mono text-[9px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>End Time</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className={`px-4 py-2.5 rounded-[16px] text-xs font-sans border backdrop-blur-md transition-all duration-300 outline-none
                          ${themeConfig.name === 'dark' 
                            ? 'bg-matte-black/50 border-white/10 focus:border-cyan-500/50 text-white' 
                            : 'bg-slate-900/[0.02] border-slate-900/10 focus:border-slate-900/30 text-slate-900'
                          }
                        `}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={`font-mono text-[9px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>Instructor</label>
                    <input
                      type="text"
                      value={instructor}
                      onChange={(e) => setInstructor(e.target.value)}
                      placeholder="e.g. Prof. J. Dela Cruz"
                      className={`px-4 py-2.5 rounded-[16px] text-xs font-sans border backdrop-blur-md transition-all duration-300 outline-none
                        ${themeConfig.name === 'dark' 
                          ? 'bg-matte-black/50 border-white/10 focus:border-cyan-500/50 text-white placeholder-white/20' 
                          : 'bg-slate-900/[0.02] border-slate-900/10 focus:border-slate-900/30 text-slate-900 placeholder-slate-400'
                        }
                      `}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_4px_15px_rgba(6,182,212,0.3)]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>SAVE SCHEDULE BLOCK</span>
                  </button>
                </form>
              ) : (
                /* SMART IMPORT FROM TEXT */
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={`font-mono text-[9px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>Paste Schedule Text</label>
                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder={`e.g.
Monday: Networking 1 07:30 - 08:30 Rm Q-5217C Prof. A
Wednesday: SIA 12:30 - 13:30 Rm Q-5411 TBA`}
                      rows={6}
                      className={`px-4 py-3 rounded-[22px] text-xs font-sans border backdrop-blur-md transition-all duration-300 outline-none resize-none
                        ${themeConfig.name === 'dark' 
                          ? 'bg-matte-black/50 border-white/10 focus:border-cyan-500/50 text-white placeholder-white/20' 
                          : 'bg-slate-900/[0.02] border-slate-900/10 focus:border-slate-900/30 text-slate-900 placeholder-slate-400'
                        }
                      `}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExtractText(false)}
                      disabled={isParsing}
                      className={`flex-1 py-2.5 rounded-xl border font-mono text-[9.5px] tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-sm
                        ${themeConfig.name === 'dark'
                          ? 'bg-white/[0.01] border-white/10 text-white hover:bg-white/[0.05]'
                          : 'bg-white border-slate-900/10 text-slate-700 hover:bg-slate-50'
                        }
                      `}
                    >
                      {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                      <span>EXTRACT OFFLINE</span>
                    </button>

                    <button
                      onClick={() => handleExtractText(true)}
                      disabled={isParsing || !hasApiKey}
                      className={`flex-1 py-2.5 rounded-xl font-mono text-[9.5px] tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-sm
                        ${!hasApiKey
                          ? 'opacity-40 cursor-not-allowed border border-white/5 text-slate-500 bg-white/[0.01]'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_4px_12px_rgba(124,58,237,0.25)]'
                        }
                      `}
                      title={!hasApiKey ? "Requires VITE_GEMINI_API_KEY set in .env" : "Extract using Gemini AI"}
                    >
                      {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>EXTRACT WITH GEMINI</span>
                    </button>
                  </div>

                  {!hasApiKey && (
                    <span className={`text-[8px] font-mono leading-relaxed mt-0.5 ${themeConfig.textDarkClass} text-center`}>
                      * Set <code className="bg-white/5 px-1 py-0.5 rounded">VITE_GEMINI_API_KEY</code> in your environment to unlock high-fidelity Gemini AI parsing.
                    </span>
                  )}

                  {/* Parsed Items Preview List */}
                  {parsedItems.length > 0 && (
                    <div className="flex flex-col gap-3 mt-2">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className={`font-mono text-[9px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>Extracted Classes ({parsedItems.length})</span>
                        <button
                          onClick={() => setParsedItems([])}
                          className="text-[8px] font-mono text-rose-400 hover:text-rose-300 uppercase cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>

                      <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {parsedItems.map((item) => {
                          const isEditing = editingTempId === item.tempId;
                          return (
                            <div
                              key={item.tempId}
                              className={`p-3.5 border rounded-[18px] flex flex-col gap-3 backdrop-blur-md transition-all duration-300
                                ${themeConfig.name === 'dark' ? 'border-white/5 bg-matte-black/30' : 'border-slate-900/5 bg-slate-900/[0.01]'}
                              `}
                            >
                              {isEditing ? (
                                /* Preview Item Edit Form */
                                <div className="flex flex-col gap-2 text-xs">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-mono text-[8px] opacity-40">Subject Name</span>
                                    <input
                                      type="text"
                                      value={editSubject}
                                      onChange={(e) => setEditSubject(e.target.value)}
                                      className="px-2 py-1.5 rounded bg-white/5 border border-white/10 outline-none text-white"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                      <span className="font-mono text-[8px] opacity-40">Day</span>
                                      <select
                                        value={editDay}
                                        onChange={(e) => setEditDay(e.target.value as any)}
                                        className="px-2 py-1.5 rounded bg-[#0f0f11] border border-white/10 outline-none text-white cursor-pointer"
                                      >
                                        {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                                      </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="font-mono text-[8px] opacity-40">Room</span>
                                      <input
                                        type="text"
                                        value={editRoom}
                                        onChange={(e) => setEditRoom(e.target.value)}
                                        className="px-2 py-1.5 rounded bg-white/5 border border-white/10 outline-none text-white"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                      <span className="font-mono text-[8px] opacity-40">Start</span>
                                      <input
                                        type="time"
                                        value={editStart}
                                        onChange={(e) => setEditStart(e.target.value)}
                                        className="px-2 py-1.5 rounded bg-white/5 border border-white/10 outline-none text-white"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="font-mono text-[8px] opacity-40">End</span>
                                      <input
                                        type="time"
                                        value={editEnd}
                                        onChange={(e) => setEditEnd(e.target.value)}
                                        className="px-2 py-1.5 rounded bg-white/5 border border-white/10 outline-none text-white"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="font-mono text-[8px] opacity-40">Instructor</span>
                                    <input
                                      type="text"
                                      value={editInstructor}
                                      onChange={(e) => setEditInstructor(e.target.value)}
                                      className="px-2 py-1.5 rounded bg-white/5 border border-white/10 outline-none text-white"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-1.5 mt-1">
                                    <button
                                      onClick={() => setEditingTempId(null)}
                                      className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-slate-300 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleSaveEdit(item.tempId)}
                                      className="px-2.5 py-1 rounded bg-cyan-600/30 border border-cyan-500/20 text-[9px] font-mono text-cyan-400 flex items-center gap-1 cursor-pointer"
                                    >
                                      <Check className="w-3 h-3" /> Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Preview Item Card */
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 flex flex-col gap-1.5">
                                    <span className={`text-[11.5px] font-bold ${themeConfig.textBrightClass}`}>
                                      {item.subject_name}
                                    </span>
                                    
                                    <div className="flex items-center gap-3 text-[9.5px] font-mono flex-wrap opacity-80">
                                      <span className="text-cyan-400">{item.day.slice(0,3).toUpperCase()}</span>
                                      <span className="flex items-center gap-0.5">
                                        <Clock className="w-3 h-3 opacity-60" />
                                        {item.start_time} - {item.end_time}
                                      </span>
                                      <span className="flex items-center gap-0.5">
                                        <MapPin className="w-3 h-3 opacity-60" />
                                        {item.room}
                                      </span>
                                      <span className="flex items-center gap-0.5">
                                        <User className="w-3 h-3 opacity-60" />
                                        {item.instructor}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleStartEdit(item)}
                                      className={`p-1.5 rounded-lg border hover:bg-white/[0.04] transition-all cursor-pointer ${themeConfig.borderClass} ${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass}`}
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item.tempId)}
                                      className={`p-1.5 rounded-lg border border-rose-500/10 hover:bg-rose-500/10 text-rose-500 transition-all cursor-pointer`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={handleImportAll}
                        className="w-full mt-2 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_4px_15px_rgba(124,58,237,0.3)]"
                      >
                        <Check className="w-4 h-4" />
                        <span>IMPORT ALL ENTRIES</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
