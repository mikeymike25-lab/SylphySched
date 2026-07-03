import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, CheckCircle, Calendar, FileText } from 'lucide-react';
import type { ScheduleItem, Note, ThemeConfig } from '../types';
import { toStandardTime } from './AscendingTimeline';

interface NoteEngineProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleItem: ScheduleItem | null;
  note: Note | null;
  onSaveNote: (note: { title: string; content: string; deadline?: string }) => void;
  themeConfig: ThemeConfig;
  onDeleteBlock: (item: ScheduleItem) => void;
}

export const NoteEngine: React.FC<NoteEngineProps> = ({
  isOpen,
  onClose,
  scheduleItem,
  note,
  onSaveNote,
  themeConfig,
  onDeleteBlock,
}) => {
  const [title, setTitle] = useState<string>('');
  const [editorText, setEditorText] = useState<string>('');
  const [deadline, setDeadline] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');

  // Auto-save debounce timer
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize and load note when scheduleItem or note changes
  useEffect(() => {
    if (!isOpen || !scheduleItem) return;

    if (note) {
      setTitle(note.title || '');
      setEditorText(note.content || '');
      setDeadline(note.deadline || '');
    } else {
      setTitle('');
      setEditorText('');
      setDeadline('');
    }
    setSaveStatus('saved');
  }, [scheduleItem, note, isOpen]);

  // Perform the saving operation
  const performSave = (currentTitle: string, currentText: string, currentDeadline: string) => {
    if (!scheduleItem) return;
    setSaveStatus('saving');

    try {
      onSaveNote({
        title: currentTitle.trim() || 'Untitled Note',
        content: currentText,
        deadline: currentDeadline || undefined,
      });
      setSaveStatus('saved');
    } catch (err) {
      console.error('Note auto-save failed:', err);
      setSaveStatus('idle');
    }
  };

  // Trigger Save with Debounce
  const triggerAutoSave = (newTitle: string, newText: string, newDeadline: string) => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      performSave(newTitle, newText, newDeadline);
    }, 800); // 800ms debounce
  };

  // Input change handlers
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    triggerAutoSave(val, editorText, deadline);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditorText(val);
    triggerAutoSave(title, val, deadline);
  };

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDeadline(val);
    triggerAutoSave(title, editorText, val);
  };

  return (
    <AnimatePresence>
      {isOpen && scheduleItem && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-matte-black/60 backdrop-blur-sm pointer-events-auto"
          />

          {/* Slide-over Note Editor Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 130, damping: 20 }}
            className={`fixed inset-y-0 right-0 z-45 w-full sm:w-[500px] h-full shadow-[0_0_50px_rgba(0,0,0,0.8)] border-l backdrop-blur-2xl p-6 flex flex-col justify-between select-none pointer-events-auto transition-colors duration-500
              ${themeConfig.name === 'dark' ? 'bg-[#0f0f11]/80 border-white/10' : 'bg-white/85 border-slate-900/10'}
            `}
          >
            {/* Header: Title and Close button */}
            <div className={`flex flex-col gap-1 border-b pb-4 mb-4 ${themeConfig.borderClass}`}>
              <div className="flex items-center justify-between">
                <span className={`font-mono text-[10px] tracking-[0.2em] font-bold ${themeConfig.accentTextClass}`}>
                  Lecture Notes
                </span>
                <button
                  onClick={onClose}
                  className={`p-1.5 rounded-full hover:bg-white/[0.04] transition-all cursor-pointer ${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-1 flex flex-col">
                <h2 className={`text-base font-bold uppercase truncate ${themeConfig.textBrightClass}`}>
                  {scheduleItem.subject_name}
                </h2>
                <div className={`flex items-center gap-1.5 font-mono text-[9px] mt-1 ${themeConfig.textMutedClass}`}>
                  <span>ROOM: {scheduleItem.room || 'TBD'}</span>
                  <span>•</span>
                  <span>{toStandardTime(scheduleItem.start_time)} - {toStandardTime(scheduleItem.end_time)}</span>
                </div>
              </div>
            </div>

            {/* Active Editor Screen */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              
              {/* Note Title Input */}
              <div className="flex flex-col gap-1.5">
                <span className={`font-mono text-[9px] tracking-wider uppercase ${themeConfig.textDarkClass} flex items-center gap-1`}>
                  <FileText className="w-3 h-3" />
                  Note Title
                </span>
                <input
                  type="text"
                  placeholder="Review Materials, Assignment details..."
                  value={title}
                  onChange={handleTitleChange}
                  className={`w-full px-4 py-2.5 rounded-[12px] border font-sans text-xs outline-none bg-white/[0.01] transition-all duration-300
                    ${themeConfig.name === 'dark' ? 'border-white/5 text-white focus:border-white/10 focus:bg-white/[0.02]' : 'border-slate-900/5 text-slate-900 bg-white/20 focus:border-slate-900/10 focus:bg-white/40'}
                  `}
                />
              </div>

              {/* Deadline Datepicker (Optional) */}
              <div className="flex flex-col gap-1.5">
                <span className={`font-mono text-[9px] tracking-wider uppercase ${themeConfig.textDarkClass} flex items-center gap-1`}>
                  <Calendar className="w-3 h-3" />
                  Task Deadline (Optional)
                </span>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={handleDeadlineChange}
                  className={`w-full px-4 py-2.5 rounded-[12px] border font-mono text-xs outline-none bg-white/[0.01] transition-all duration-300
                    ${themeConfig.name === 'dark' ? 'border-white/5 text-white focus:border-white/10 focus:bg-white/[0.02] [color-scheme:dark]' : 'border-slate-900/5 text-slate-900 bg-white/20 focus:border-slate-900/10 focus:bg-white/40'}
                  `}
                />
              </div>

              {/* Editor Textarea */}
              <div className="flex-1 flex flex-col gap-1.5 relative overflow-hidden">
                <span className={`font-mono text-[9px] tracking-wider uppercase ${themeConfig.textDarkClass}`}>
                  Markdown Notes Content
                </span>
                <textarea
                  placeholder="# Write-ups / Tasks / Notes...&#10;&#10;Supports markdown structure. Saved locally in real-time."
                  value={editorText}
                  onChange={handleTextChange}
                  className={`flex-1 w-full p-4 rounded-[18px] border font-sans text-xs outline-none resize-none bg-white/[0.01] leading-relaxed transition-all duration-300
                    ${themeConfig.name === 'dark' ? 'border-white/5 text-white focus:border-white/10 focus:bg-white/[0.02]' : 'border-slate-900/5 text-slate-900 bg-white/20 focus:border-slate-900/10 focus:bg-white/40'}
                  `}
                />
              </div>
            </div>

            {/* Footer status bar */}
            <div className={`mt-4 border-t pt-3 flex items-center justify-between text-[10px] font-mono select-none ${themeConfig.borderClass} ${themeConfig.textDarkClass}`}>
              <div className="flex items-center gap-1.5">
                {saveStatus === 'saving' ? (
                  <>
                    <Save className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving notes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className={`w-3.5 h-3.5 ${themeConfig.accentTextClass}`} />
                    <span>Notes Auto-Saved</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="opacity-75">UTF-8</span>
                <button
                  onClick={() => onDeleteBlock(scheduleItem)}
                  className="text-rose-500 hover:text-rose-400 font-bold hover:underline cursor-pointer"
                >
                  DELETE SESSION
                </button>
              </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
