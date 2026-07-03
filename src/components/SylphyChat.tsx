import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, User, Loader2, Info } from 'lucide-react';
import type { ScheduleItem, ThemeConfig } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'sylphy';
  text: string;
  timestamp: Date;
}

interface SylphyChatProps {
  schedule: Record<string, ScheduleItem[]>;
  userName?: string | null;
  themeConfig: ThemeConfig;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

export const SylphyChat: React.FC<SylphyChatProps> = ({
  schedule,
  userName,
  themeConfig,
  isOpen: parentIsOpen,
  onToggleOpen,
}) => {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen = parentIsOpen !== undefined ? parentIsOpen : localIsOpen;
  const toggleOpen = onToggleOpen !== undefined ? onToggleOpen : () => setLocalIsOpen(prev => !prev);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasApiKey = !!import.meta.env.VITE_GEMINI_API_KEY;
  const nameToUse = userName || 'Student';

  // Initialize with a welcome message on first open
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'sylphy',
          text: `Hi ${nameToUse}! I'm Sylphy, your AI assistant. I have access to your weekly schedule and notes. You can ask me questions like:
- *"What classes do I have on Mondays?"*
- *"Who is my instructor for IT 021?"*
- *"How do I edit my profile picture or change my theme?"*
- *"What are the key features of this app?"*`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [nameToUse, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    if (!hasApiKey) {
      // Offline fallback responder
      setTimeout(() => {
        const reply = getOfflineFallbackResponse(userMessage.text, schedule, nameToUse);
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            sender: 'sylphy',
            text: reply,
            timestamp: new Date(),
          },
        ]);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const systemPrompt = `You are "Sylphy", a highly intelligent, friendly, and helpful academic study assistant for a student named ${nameToUse}. 
You have access to their current class schedule (JSON format):
${JSON.stringify(schedule, null, 2)}

You also have complete knowledge of the SylphySched web application features to help them with tutorials, guides, and errors:
- **Timeline Tab:** Shows their chronological classes, gaps, start/end times, and a floating indicator of the active class now. They can add a class block by clicking the "+" button in the top-right header.
- **Notes Tab (previously Vault):** Located next to the Timeline. Allows them to add study notes (associated with a specific course or as a General Note), set deadlines, filter notes by subject, and toggle completed checkboxes. They can add notes directly by clicking the "ADD NOTE" button in the notes panel.
- **Spotify Player:** Displays current Spotify playback info, album art, and controls (Play/Pause/Next/Prev) if connected to their Spotify account via the widget on the sidebar.
- **Weather Widget:** Displays local real-time temperature and weather icons in the header and sidebar.
- **Control Panel Sidebar:** Lets them sync or simulate time (adjusting simulation speed and manual offsets), toggle notifications/sound alerts, see daily quotes, and connect Spotify.
- **Profile Customizer:** Located in Settings (gear icon on the Control Panel sidebar). Users can edit their display name and upload a profile picture. Images are compressed offline using HTML5 canvas to a square 128x128 JPEG data URL and stored locally/Firebase.
- **Onboarding Modal:** Pops up for new users to welcome them and direct them to either import their schedule using Gemini AI or load demo courses.

Keep your answers concise, clear, and focused on helping the student. Answer questions directly using the schedule details above. Avoid using markdown formatting headers unless necessary, and keep a friendly, supportive tone.`;

      const apiMessages = [
        { role: 'user', parts: [{ text: `System context:\n${systemPrompt}` }] },
        ...messages.map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        })),
        { role: 'user', parts: [{ text: userMessage.text }] },
      ];

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: apiMessages.slice(-5), // Send last 5 turns of conversation context
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'sylphy',
          text: replyText || "I couldn't think of a response. Please try again!",
          timestamp: new Date(),
        },
      ]);
    } catch (error: any) {
      console.error('Sylphy AI Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'sylphy',
          text: `Oops! I had trouble connecting to the network. Here is an offline suggestion:\n\n${getOfflineFallbackResponse(userMessage.text, schedule, nameToUse)}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <div className="fixed bottom-6 left-6 z-40 hidden lg:block">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleOpen}
          className={`relative p-4 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.3)] border cursor-pointer flex items-center justify-center transition-all duration-300
            ${themeConfig.name === 'dark'
              ? 'bg-[#0f0f11]/85 text-cyber-cyan border-white/10 hover:shadow-[0_0_15px_rgba(0,229,255,0.2)]'
              : 'bg-slate-900 text-white border-slate-900/10 hover:bg-slate-800'
            }
          `}
          title="Chat with Sylphy"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <X className="w-5 h-5" key="close" />
            ) : (
              <div className="flex items-center gap-1.5" key="open">
                <MessageSquare className="w-5 h-5" />
                <span className="text-[10px] font-mono tracking-wider font-bold hidden sm:inline">SYLPHY AI</span>
              </div>
            )}
          </AnimatePresence>
          {!isOpen && (
            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          )}
        </motion.button>
      </div>

      {/* Sliding Glass Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 150, damping: 18 }}
            className={`fixed bottom-24 left-6 z-45 w-[90%] sm:w-[380px] h-[500px] shadow-[0_24px_50px_rgba(0,0,0,0.4)] border rounded-[28px] backdrop-blur-3xl p-5 flex flex-col justify-between transition-colors duration-500
              ${themeConfig.name === 'dark' ? 'bg-[#0c0c0f]/90 border-white/10' : 'bg-white/90 border-slate-900/10'}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center text-white relative">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${themeConfig.textBrightClass}`}>
                    Sylphy Assistant
                  </h3>
                  <span className={`text-[8px] font-mono ${themeConfig.textDarkClass}`}>
                    {hasApiKey ? 'Online (Gemini AI)' : 'Offline Helper'}
                  </span>
                </div>
              </div>
              <button
                onClick={toggleOpen}
                className={`p-1 rounded-full hover:bg-white/[0.04] transition-all cursor-pointer ${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning Message if No API Key */}
            {!hasApiKey && (
              <div className="mt-2 p-2 border border-amber-500/10 bg-amber-500/5 rounded-xl flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-[8px] font-mono text-amber-400 leading-normal">
                  VITE_GEMINI_API_KEY is not set. Sylphy is running in offline guide mode. Add a key to unlock intelligent AI chat.
                </span>
              </div>
            )}

            {/* Chat History Panel */}
            <div className="flex-1 overflow-y-auto scrollbar-none my-4 pr-1 flex flex-col gap-3">
              {messages.map((m) => {
                const isSylphy = m.sender === 'sylphy';
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2 max-w-[85%]
                      ${isSylphy ? 'self-start' : 'self-end flex-row-reverse'}
                    `}
                  >
                    {isSylphy ? (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center text-white shrink-0 mt-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                      </div>
                    ) : (
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${themeConfig.borderClass}`}>
                        <User className="w-2.5 h-2.5 text-slate-400" />
                      </div>
                    )}

                    <div className={`px-3 py-2 rounded-[18px] text-[11px] leading-relaxed font-sans select-text
                      ${isSylphy
                        ? themeConfig.name === 'dark' 
                          ? 'bg-white/[0.03] border border-white/5 text-slate-200' 
                          : 'bg-slate-100 border border-slate-200/50 text-slate-800'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium'
                      }
                    `}>
                      {renderFormattedText(m.text)}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex items-center gap-2 self-start max-w-[85%]">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center text-white shrink-0">
                    <Sparkles className="w-2.5 h-2.5" />
                  </div>
                  <div className={`px-3 py-2 rounded-[18px] text-[11px] backdrop-blur-md flex items-center gap-1.5 ${themeConfig.name === 'dark' ? 'bg-white/[0.03] text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                    <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                    <span>Sylphy is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center pt-2 border-t border-white/5">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask Sylphy something..."
                className={`flex-1 px-4 py-2.5 rounded-full text-xs font-sans border outline-none
                  ${themeConfig.name === 'dark'
                    ? 'bg-matte-black border-white/10 text-white placeholder-white/20 focus:border-cyan-500/50'
                    : 'bg-white border-slate-900/10 text-slate-900 placeholder-slate-400 focus:border-slate-900/30'
                  }
                `}
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`p-2.5 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300
                  ${!inputText.trim()
                    ? 'opacity-40 bg-white/5 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 shadow-md'
                  }
                `}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Basic offline pattern matcher to reply to common user questions when VITE_GEMINI_API_KEY is not set
 */
const getOfflineFallbackResponse = (
  text: string,
  schedule: Record<string, ScheduleItem[]>,
  userName: string
): string => {
  const query = text.toLowerCase();

  // 1. App Navigation Guide
  if (query.includes('navig') || query.includes('feature') || query.includes('use') || query.includes('help') || query.includes('tutorial')) {
    return `Here are the main features of SylphySched and how to use them:
- **Timeline:** View your classes and free gaps. Click the "+" button in the header to add blocks manually or parse copy-pasted schedule text.
- **Notes:** Click the "NOTES" tab at the top. You can filter notes by target subject, add general or course-bound notes, set due dates, and track completion.
- **Spotify Integration:** Control your Spotify player directly on the sidebar. Connect your account from the Control Panel.
- **Profile Changer:** Open settings (gear icon on the Control Panel sidebar) to change your username or upload an avatar image.`;
  }

  // 2. Class schedule questions
  if (query.includes('schedule') || query.includes('class') || query.includes('subject') || query.includes('monday') || query.includes('tuesday') || query.includes('wednesday') || query.includes('thursday') || query.includes('friday') || query.includes('saturday') || query.includes('sunday')) {
    let dayToFind = '';
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const d of days) {
      if (query.includes(d.toLowerCase())) {
        dayToFind = d;
        break;
      }
    }

    if (dayToFind) {
      const items = schedule[dayToFind] || [];
      if (items.length === 0) {
        return `You have no classes scheduled for ${dayToFind}. It's a free day!`;
      }
      const classesText = items.map((i) => `• ${i.subject_name} (${i.start_time} - ${i.end_time}) in ${i.room || 'TBD'} with ${i.instructor || 'TBA'}`).join('\n');
      return `Here is your schedule for ${dayToFind}:\n${classesText}`;
    }

    // General schedule summary
    const daysWithClasses = Object.entries(schedule).filter(([_, items]) => items.length > 0);
    if (daysWithClasses.length === 0) {
      return `Your schedule is currently empty! Click the "+" button in the top bar to add class blocks or upload schedule texts.`;
    }
    const summary = daysWithClasses.map(([day, items]) => `• ${day}: ${items.length} classes`).join('\n');
    return `Here is a summary of your active weekly classes:\n${summary}`;
  }

  // 3. Profile picture / Settings Guide
  if (query.includes('profile') || query.includes('photo') || query.includes('avatar') || query.includes('picture') || query.includes('image')) {
    return `To change your profile name or upload an avatar photo:
1. Locate the **Control Panel** sidebar (on desktop, it's on the right; on mobile, click the settings drawer FAB on the bottom right).
2. Click the **Gear Icon** at the top right of the Control Panel.
3. Click the **Edit Icon** on the user profile card.
4. Click your avatar to upload a local image (we compress it locally to a 128x128 JPEG data URL and save it automatically) or type a new display name, then click **Save**!`;
  }

  // 4. Spotify guide
  if (query.includes('spotify') || query.includes('music') || query.includes('song')) {
    return `To connect and control Spotify in SylphySched:
1. Locate the Spotify Player widget inside the **Control Panel** sidebar.
2. Click **Connect Spotify**. It will authenticate your Spotify account.
3. Once connected, it displays the album cover, song name, and artist, and lets you play, pause, skip, and adjust playback volumes.`;
  }

  // 5. General greeting
  return `Hi ${userName}! I can see your weekly schedule. Ask me questions like *"What classes do I have on Mondays?"* or ask for app tutorials like *"How do I upload a profile photo?"* to get started.`;
};

/**
 * Renders text with parsed markdown formatting for bold (**text**), italics (*text*), and lists (* item)
 */
const renderFormattedText = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, lineIndex) => {
    let trimmed = line.trim();
    if (!trimmed) {
      return <div key={lineIndex} className="h-2" />;
    }

    const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ');
    if (isBullet) {
      trimmed = trimmed.substring(2).trim();
    }

    // Parse bold (**)
    const parts = trimmed.split(/(\*\*.*?\*\*)/g);
    const content = parts.map((part, partIndex) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={partIndex} className="font-bold text-white">{boldText}</strong>;
      }
      
      // Parse italics (*)
      const italicParts = part.split(/(\*.*?\*)/g);
      return italicParts.map((subPart, subIndex) => {
        if (subPart.startsWith('*') && subPart.endsWith('*')) {
          const italicText = subPart.slice(1, -1);
          return <em key={subIndex} className="italic">{italicText}</em>;
        }
        return subPart;
      });
    });

    if (isBullet) {
      return (
        <div key={lineIndex} className="flex items-start gap-1.5 ml-1 my-0.5">
          <span className="text-cyan-400 mt-1 shrink-0 text-[10px]">•</span>
          <div>{content}</div>
        </div>
      );
    }

    return (
      <div key={lineIndex} className="my-0.5">
        {content}
      </div>
    );
  });
};
