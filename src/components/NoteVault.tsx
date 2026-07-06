import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Edit3, Trash2, Inbox, Filter, ShieldAlert, Plus, Calendar, X, Save } from 'lucide-react';
import type { Note, ScheduleItem, ThemeConfig } from '../types';

interface NoteVaultProps {
  notes: Record<string, Note>;
  schedule: Record<string, ScheduleItem[]>;
  onToggleDone: (noteId: string) => void;
  onDeleteNote: (scheduleId: string) => void;
  onSaveNote: (scheduleId: string, noteData: { title: string; content: string; deadline?: string }) => void;
  themeConfig: ThemeConfig;
  currentTime: Date;
}

export const NoteVault: React.FC<NoteVaultProps> = ({
  notes,
  schedule,
  onToggleDone,
  onDeleteNote,
  onSaveNote,
  themeConfig,
  currentTime,
}) => {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [modalDeadline, setModalDeadline] = useState('');
  const [modalSubject, setModalSubject] = useState('GENERAL');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Strip " - Lab" or " Lab" suffix to unify course subject names
  const cleanSubjectName = (name: string): string =>
    name.replace(/\s*-\s*Lab$/i, '').replace(/\s+Lab$/i, '').trim();

  // Extract unique CLEANED subject names from the schedule to populate filter/selection options
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>();
    for (const dayItems of Object.values(schedule)) {
      for (const item of dayItems) {
        subjects.add(cleanSubjectName(item.subject_name));
      }
    }
    return Array.from(subjects).sort();
  }, [schedule]);

  // Build deduplicated subject options: one entry per unique cleaned name
  const subjectOptions = useMemo(() => {
    const options: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    for (const dayItems of Object.values(schedule)) {
      for (const item of dayItems) {
        const cleaned = cleanSubjectName(item.subject_name);
        if (!seen.has(cleaned)) {
          seen.add(cleaned);
          // Use the lecture item's id (non-lab) when possible, else use whatever comes first
          options.push({ id: item.id, name: cleaned });
        }
      }
    }
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [schedule]);

  // Map schedule ID to cleaned subject name helper
  const getSubjectName = (scheduleId: string): string => {
    for (const dayItems of Object.values(schedule)) {
      const match = dayItems.find((item) => item.id === scheduleId);
      if (match) return cleanSubjectName(match.subject_name);
    }
    return 'General Note';
  };

  // Convert Note records to list and filter
  const filteredNotes = useMemo(() => {
    const allNotes = Object.values(notes);
    if (selectedSubjectFilter === 'ALL') {
      return allNotes;
    }
    return allNotes.filter((note) => {
      const subjectName = getSubjectName(note.schedule_id);
      return subjectName === selectedSubjectFilter;
    });
  }, [notes, selectedSubjectFilter, schedule]);

  const handleOpenAddModal = () => {
    setModalTitle('');
    setModalContent('');
    setModalDeadline('');
    setModalSubject('GENERAL');
    setEditingNoteId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (note: Note) => {
    setModalTitle(note.title);
    setModalContent(note.content);
    setModalDeadline(note.deadline || '');
    setModalSubject(note.schedule_id);
    setEditingNoteId(note.id);
    setIsModalOpen(true);
  };

  const handleSaveModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;

    // If "GENERAL" no-subject is selected, use a unique ID key (preserved if editing)
    const targetScheduleId = modalSubject === 'GENERAL'
      ? (editingNoteId || 'note_' + Math.random().toString(36).substring(2, 9))
      : modalSubject;

    onSaveNote(targetScheduleId, {
      title: modalTitle.trim(),
      content: modalContent.trim(),
      deadline: modalDeadline || undefined,
    });

    setIsModalOpen(false);
  };

  // Helper to format remaining time / overdue alerts
  const getDeadlineBadgeInfo = (deadlineStr: string) => {
    const dl = new Date(deadlineStr);
    const diffMs = dl.getTime() - currentTime.getTime();
    const isOverdue = diffMs < 0;
    
    if (isOverdue) {
      return {
        text: 'OVERDUE',
        bgClass: 'bg-rose-500/10 border border-rose-500/20 text-rose-500',
        alertIcon: true,
      };
    }

    const hoursRemaining = diffMs / (1000 * 60 * 60);
    const daysRemaining = hoursRemaining / 24;

    if (hoursRemaining <= 1) {
      return {
        text: 'LESS THAN 1 HOUR REMAINING',
        bgClass: 'bg-rose-600/20 border border-rose-500/30 text-rose-400 font-bold animate-pulse',
        alertIcon: true,
      };
    }

    if (hoursRemaining <= 6) {
      return {
        text: `${Math.ceil(hoursRemaining)} HOURS REMAINING`,
        bgClass: 'bg-amber-500/15 border border-amber-500/25 text-amber-400 font-bold',
        alertIcon: true,
      };
    }

    if (hoursRemaining <= 24) {
      return {
        text: `${Math.ceil(hoursRemaining)} HOURS REMAINING`,
        bgClass: 'bg-amber-500/10 border border-amber-500/20 text-amber-500',
        alertIcon: false,
      };
    }

    return {
      text: `${Math.ceil(daysRemaining)} DAYS REMAINING`,
      bgClass: 'bg-cyber-cyan/10 border border-cyber-cyan/20 text-cyber-cyan',
      alertIcon: false,
    };
  };

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-6 overflow-hidden select-none relative">
      
      {/* Filters & Actions Header Row */}
      <div className="mb-6 shrink-0 flex items-end justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 font-mono text-[9px] tracking-wider uppercase mb-2.5 ${themeConfig.textDarkClass}`}>
            <Filter className="w-3.5 h-3.5" />
            <span>FILTER BY COURSE TARGET</span>
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 flex-nowrap">
            {/* ALL option */}
            <button
              onClick={() => setSelectedSubjectFilter('ALL')}
              className={`px-4 py-1.5 rounded-full text-xs font-mono tracking-wider cursor-pointer border transition-all duration-300 shrink-0
                ${selectedSubjectFilter === 'ALL'
                  ? `${themeConfig.accentBgClass} ${themeConfig.accentBorderClass} ${themeConfig.accentTextClass} font-bold shadow-sm`
                  : `${themeConfig.name === 'dark' ? 'border-white/5 bg-white/[0.01] hover:bg-white/[0.04] text-text-dark hover:text-text-muted' : 'border-slate-900/5 bg-slate-900/[0.01] hover:bg-slate-900/[0.04] text-slate-500 hover:text-slate-700'}`
                }
              `}
            >
              ALL SUBJECTS ({Object.keys(notes).length})
            </button>

            {/* Dynamic Subject filters */}
            {uniqueSubjects.map((sub) => {
              const count = Object.values(notes).filter((n) => getSubjectName(n.schedule_id) === sub).length;
              if (count === 0) return null; // Only show courses with active notes

              const isActive = selectedSubjectFilter === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubjectFilter(sub)}
                  className={`px-4 py-1.5 rounded-full text-xs font-mono tracking-wider cursor-pointer border transition-all duration-300 shrink-0
                    ${isActive
                      ? `${themeConfig.accentBgClass} ${themeConfig.accentBorderClass} ${themeConfig.accentTextClass} font-bold shadow-sm`
                      : `${themeConfig.name === 'dark' ? 'border-white/5 bg-white/[0.01] hover:bg-white/[0.04] text-text-dark hover:text-text-muted' : 'border-slate-900/5 bg-slate-900/[0.01] hover:bg-slate-900/[0.04] text-slate-500 hover:text-slate-700'}`
                    }
                  `}
                >
                  {sub.toUpperCase()} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Add Note Icon button */}
        <button
          onClick={handleOpenAddModal}
          className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border font-mono text-[9px] tracking-wider cursor-pointer transition-all duration-300 shrink-0 shadow-sm
            ${themeConfig.name === 'dark'
              ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-cyber-cyan hover:shadow-[0_0_12px_rgba(0,229,255,0.1)]'
              : 'bg-slate-900 text-white border-slate-900/10 hover:bg-slate-800'
            }
          `}
          title="Compose New Note"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>ADD NOTE</span>
        </button>
      </div>

      {/* Grid of Note Cards */}
      <div className="flex-1 overflow-y-auto scrollbar-none pr-1">
        <AnimatePresence mode="popLayout">
          {filteredNotes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className={`w-full py-16 flex flex-col items-center justify-center text-center gap-3 border border-dashed rounded-[28px] backdrop-blur-md bg-white/[0.01]
                ${themeConfig.name === 'dark' ? 'border-white/10' : 'border-slate-900/10'}
              `}
            >
              <Inbox className={`w-8 h-8 ${themeConfig.textDarkClass}`} />
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider font-mono ${themeConfig.textBrightClass}`}>
                  No Notes Found
                </h3>
                <p className={`text-xs mt-1 leading-relaxed ${themeConfig.textDarkClass}`}>
                  {selectedSubjectFilter === 'ALL'
                    ? "Click 'ADD NOTE' or tap on any course block in the timeline to compose notes."
                    : `No active tasks or notes registered under course "${selectedSubjectFilter}".`}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredNotes.map((note) => {
                const subject = getSubjectName(note.schedule_id);
                const badge = note.deadline ? getDeadlineBadgeInfo(note.deadline) : null;

                return (
                  <motion.div
                    layout
                    key={note.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 16 }}
                    className={`border rounded-[22px] p-5 flex flex-col justify-between min-h-[160px] relative transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-md bg-white/[0.01] group
                      ${themeConfig.name === 'dark' ? 'border-white/10 hover:border-white/20' : 'border-slate-900/10 hover:border-slate-900/20'}
                      ${note.is_done && 'opacity-60'}
                    `}
                  >
                    {/* Top Row: Checkbox Title and Edit/Delete Actions */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* Custom Completion Checkbox */}
                        <button
                          onClick={() => onToggleDone(note.id)}
                          className={`w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer transition-colors duration-300 mt-0.5 shrink-0
                            ${note.is_done 
                              ? 'bg-emerald-500 border-emerald-500 text-white' 
                              : `${themeConfig.name === 'dark' ? 'border-white/20 hover:border-white/40' : 'border-slate-900/20 hover:border-slate-900/40'} bg-transparent`
                            }
                          `}
                        >
                          {note.is_done && <Check className="w-2.5 h-2.5" />}
                        </button>
                        
                        <h3 className={`text-sm font-bold truncate leading-tight uppercase font-sans ${themeConfig.textBrightClass} ${note.is_done && 'line-through opacity-50'}`}>
                          {note.title}
                        </h3>
                      </div>

                      {/* Monochromatic edit & delete buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={() => handleOpenEditModal(note)}
                          className={`p-1.5 rounded-full hover:bg-white/[0.04] transition-colors cursor-pointer ${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass}`}
                          title="Edit Note"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteNote(note.schedule_id)}
                          className="p-1.5 rounded-full hover:bg-rose-500/10 transition-colors cursor-pointer text-rose-500/60 hover:text-rose-500"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Course Monospace Tag */}
                    <div className={`font-mono text-[9px] font-semibold tracking-wider uppercase mb-3 ${themeConfig.accentTextClass}`}>
                      {subject}
                    </div>

                    {/* Content preview snippet */}
                    <p className={`text-xs leading-relaxed font-sans mb-4 line-clamp-3 select-text ${themeConfig.textMutedClass}`}>
                      {note.content}
                    </p>

                    {/* Card Footer: Deadline Badge */}
                    {note.deadline && (
                      <div className="mt-auto pt-3 border-t border-dashed border-white/5 dark:border-white/5 border-slate-900/5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[8px] flex items-center gap-1 uppercase ${badge?.bgClass}`}>
                            {badge?.alertIcon && <ShieldAlert className="w-2.5 h-2.5 shrink-0" />}
                            {badge?.text}
                          </span>
                          <span className={`font-mono text-[8.5px] ${themeConfig.textDarkClass}`}>
                            {new Date(note.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Inline Add/Edit Note Modal (Liquid Glass dialog box) */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 z-40 bg-matte-black/60 backdrop-blur-sm pointer-events-auto rounded-[28px]"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 150, damping: 18 }}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-45 w-[90%] max-w-[400px] p-6 rounded-[24px] border shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl pointer-events-auto flex flex-col gap-4.5 transition-colors duration-500
                ${themeConfig.name === 'dark' ? 'bg-[#0f0f12]/95 border-white/10' : 'bg-white/95 border-slate-900/10'}
              `}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-3 border-white/5">
                <div className="flex items-center gap-2">
                  <Inbox className={`w-4 h-4 ${themeConfig.accentTextClass}`} />
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${themeConfig.textBrightClass}`}>
                    {editingNoteId ? 'Edit Lecture Note' : 'New Lecture Note'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={`p-1 rounded-full hover:bg-white/[0.04] transition-all cursor-pointer ${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveModalSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={`font-mono text-[8px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>Note Title</label>
                  <input
                    type="text"
                    required
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    placeholder="e.g. Study Networking Chapter 1"
                    className={`px-3 py-2 rounded-xl text-xs font-sans border outline-none
                      ${themeConfig.name === 'dark'
                        ? 'bg-matte-black border-white/10 text-white placeholder-white/20 focus:border-cyan-500/50'
                        : 'bg-white border-slate-900/10 text-slate-900 placeholder-slate-400 focus:border-slate-900/30'
                      }
                    `}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`font-mono text-[8px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>Select Subject (Optional)</label>
                  <select
                    value={modalSubject}
                    onChange={(e) => setModalSubject(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-sans border outline-none cursor-pointer
                      ${themeConfig.name === 'dark'
                        ? 'bg-[#0f0f11] border-white/10 text-white focus:border-cyan-500/50'
                        : 'bg-white border-slate-900/10 text-slate-900 focus:border-slate-900/30'
                      }
                    `}
                  >
                    <option value="GENERAL">No Subject (General Note)</option>
                    {subjectOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`font-mono text-[8px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>Note Details</label>
                  <textarea
                    rows={4}
                    value={modalContent}
                    onChange={(e) => setModalContent(e.target.value)}
                    placeholder="Write your lectures notes, tasks, or study reminders here..."
                    className={`px-3 py-2 rounded-xl text-xs font-sans border outline-none resize-none
                      ${themeConfig.name === 'dark'
                        ? 'bg-matte-black border-white/10 text-white placeholder-white/20 focus:border-cyan-500/50'
                        : 'bg-white border-slate-900/10 text-slate-900 placeholder-slate-400 focus:border-slate-900/30'
                      }
                    `}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1">
                    <Calendar className={`w-3.5 h-3.5 ${themeConfig.textDarkClass}`} />
                    <label className={`font-mono text-[8px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>Deadline Alert (Optional)</label>
                  </div>
                  <input
                    type="datetime-local"
                    value={modalDeadline}
                    onChange={(e) => setModalDeadline(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-sans border outline-none cursor-pointer
                      ${themeConfig.name === 'dark'
                        ? 'bg-matte-black border-white/10 text-white focus:border-cyan-500/50'
                        : 'bg-white border-slate-900/10 text-slate-900 focus:border-slate-900/30'
                      }
                    `}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!modalTitle.trim()}
                  className={`w-full mt-2 py-2.5 rounded-full font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-md
                    ${!modalTitle.trim()
                      ? 'opacity-40 cursor-not-allowed border border-white/5 text-slate-500 bg-white/[0.01]'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-[0_4px_12px_rgba(6,182,212,0.25)]'
                    }
                  `}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>SAVE NOTE</span>
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
