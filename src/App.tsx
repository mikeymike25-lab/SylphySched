import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AscendingTimeline, timeToMinutes } from './components/AscendingTimeline';
import { ControlPanel } from './components/ControlPanel';
import { ToastNotification } from './components/ToastNotification';
import { NoteEngine } from './components/NoteEngine';
import { NoteVault } from './components/NoteVault';
import { LoginScreen } from './components/LoginScreen';
import { SettingsDrawer } from './components/SettingsDrawer';
import { AddScheduleModal } from './components/AddScheduleModal';
import { WelcomeModal } from './components/WelcomeModal';
import { SylphyChat } from './components/SylphyChat';
import { NotificationPermissionModal } from './components/NotificationPermissionModal';
import type { ScheduleItem, ToastMessage, ThemeName, ThemeConfig, Note } from './types';
import { Calendar, SlidersHorizontal, Loader2, User, Plus, MessageSquare, ClipboardList } from 'lucide-react';
import { getDailyInspiration } from './utils/inspiration';
import { useWeather } from './hooks/useWeather';
import { WeatherWidget } from './components/WeatherWidget';

// Firebase Client SDK Modules
import { auth, db, getFirebaseMessaging } from './utils/firebase';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

// Web Audio API Synthesizer Tone Generator (CORS-free custom sound effects)
const playNotificationSound = (type: 'start' | 'end' | 'system') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'start') {
      // Futuristic cyber beep chime: high-pitch quick double-tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
      
      setTimeout(() => {
        try {
          const ctx2 = new AudioContextClass();
          const osc2 = ctx2.createOscillator();
          const gain2 = ctx2.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx2.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(880, ctx2.currentTime); // A5
          gain2.gain.setValueAtTime(0.12, ctx2.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 0.15);
          osc2.start(ctx2.currentTime);
          osc2.stop(ctx2.currentTime + 0.16);
        } catch (e) {
          // ignore context errors
        }
      }, 70);
    } else if (type === 'end') {
      // Futuristic ending chime: double descending tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(698.46, ctx.currentTime); // F5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.16);
      
      setTimeout(() => {
        try {
          const ctx2 = new AudioContextClass();
          const osc2 = ctx2.createOscillator();
          const gain2 = ctx2.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx2.destination);
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(523.25, ctx2.currentTime); // C5
          gain2.gain.setValueAtTime(0.1, ctx2.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 0.2);
          osc2.start(ctx2.currentTime);
          osc2.stop(ctx2.currentTime + 0.22);
        } catch (e) {
          // ignore context errors
        }
      }, 90);
    } else {
      // System tone: single clean pulse
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch (e) {
    console.warn('Synthesized notification sound failed to play:', e);
  }
};

// Muted, Eye-Comfortable Duotone Themes Map
const THEME_CONFIGS: Record<ThemeName, ThemeConfig> = {
  dark: {
    name: 'dark',
    bgClass: 'bg-matte-black/95',
    panelClass: 'bg-[#0f0f11]/50 border-white/5',
    cardClass: 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-white/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.25)]',
    cardActiveBg: 'bg-white/[0.08] border-white/20',
    borderClass: 'border-white/5',
    textBrightClass: 'text-text-bright',
    textMutedClass: 'text-text-muted',
    textDarkClass: 'text-text-dark',
    accentTextClass: 'text-cyber-cyan',
    accentBgClass: 'bg-cyber-cyan/15',
    accentBorderClass: 'border-cyber-cyan/30',
    accentDotClass: 'bg-cyber-cyan',
    indicatorLineClass: 'bg-cyber-cyan shadow-[0_0_10px_#00e5ff]',
    indicatorBadgeClass: 'bg-cyber-cyan text-matte-black shadow-[0_0_8px_rgba(0,229,255,0.4)]',
    indicatorDotClass: 'bg-cyber-cyan shadow-[0_0_6px_#00e5ff]',
    blobColors: ['bg-cyber-cyan/10', 'bg-purple-500/8', 'bg-indigo-500/10'],
  },
  light: {
    name: 'light',
    bgClass: 'bg-[#e2e8f0]', // Matte slate-200: warm and comfortable to look at (not stark glaring white!)
    panelClass: 'bg-slate-900/[0.03] border-slate-900/10',
    cardClass: 'bg-slate-900/[0.02] border-slate-900/10 hover:bg-slate-900/[0.05] hover:border-slate-900/20 hover:shadow-[0_12px_30px_rgba(15,23,42,0.04)] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.5),0_4px_15px_rgba(0,0,0,0.015)]',
    cardActiveBg: 'bg-slate-900/[0.06] border-slate-900/20 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.7),0_8px_20px_rgba(15,23,42,0.05)]',
    borderClass: 'border-slate-900/10',
    textBrightClass: 'text-slate-900',
    textMutedClass: 'text-slate-700',
    textDarkClass: 'text-slate-500',
    accentTextClass: 'text-slate-900 font-bold',
    accentBgClass: 'bg-slate-900/10',
    accentBorderClass: 'border-slate-900/25',
    accentDotClass: 'bg-slate-900',
    indicatorLineClass: 'bg-slate-900 shadow-[0_0_8px_rgba(15,23,42,0.2)]',
    indicatorBadgeClass: 'bg-slate-900 text-white shadow-sm',
    indicatorDotClass: 'bg-slate-900',
    blobColors: ['bg-white/20', 'bg-slate-300/10', 'bg-slate-100/20'],
  },
  pink: {
    name: 'pink',
    bgClass: 'bg-[#140a0c]', // Burgundy Night: deep cherry black, highly soothing and aesthetic
    panelClass: 'bg-pink-500/[0.02] border-pink-500/10',
    cardClass: 'bg-pink-500/[0.03] border-pink-500/10 hover:bg-pink-500/[0.08] hover:border-pink-500/20 hover:shadow-[0_12px_40px_rgba(219,39,119,0.25)] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.3)]',
    cardActiveBg: 'bg-pink-500/[0.08] border-pink-500/20',
    borderClass: 'border-pink-500/10',
    textBrightClass: 'text-pink-100',
    textMutedClass: 'text-pink-300',
    textDarkClass: 'text-pink-600',
    accentTextClass: 'text-pink-400',
    accentBgClass: 'bg-pink-500/15',
    accentBorderClass: 'border-pink-500/30',
    accentDotClass: 'bg-pink-400',
    indicatorLineClass: 'bg-pink-500 shadow-[0_0_10px_#f43f5e]',
    indicatorBadgeClass: 'bg-pink-500 text-black shadow-[0_0_8px_rgba(244,63,94,0.4)]',
    indicatorDotClass: 'bg-pink-400 shadow-[0_0_6px_#f43f5e]',
    blobColors: ['bg-pink-500/8', 'bg-rose-500/6', 'bg-amber-500/4'],
  },
  blue: {
    name: 'blue',
    bgClass: 'bg-[#060c16]', // Midnight Aero: deep glacier dark navy, zero eye strain
    panelClass: 'bg-sky-500/[0.02] border-sky-500/10',
    cardClass: 'bg-sky-500/[0.03] border-sky-500/10 hover:bg-sky-500/[0.08] hover:border-sky-500/20 hover:shadow-[0_12px_40px_rgba(14,165,233,0.25)] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.3)]',
    cardActiveBg: 'bg-sky-500/[0.08] border-sky-500/20',
    borderClass: 'border-sky-500/10',
    textBrightClass: 'text-sky-100',
    textMutedClass: 'text-sky-300',
    textDarkClass: 'text-sky-600',
    accentTextClass: 'text-sky-400',
    accentBgClass: 'bg-sky-500/15',
    accentBorderClass: 'border-sky-500/30',
    accentDotClass: 'bg-sky-400',
    indicatorLineClass: 'bg-sky-500 shadow-[0_0_10px_#0ea5e9]',
    indicatorBadgeClass: 'bg-sky-500 text-black shadow-[0_0_8px_rgba(14,165,233,0.4)]',
    indicatorDotClass: 'bg-sky-400 shadow-[0_0_6px_#0ea5e9]',
    blobColors: ['bg-sky-500/8', 'bg-indigo-500/6', 'bg-cyan-500/6'],
  },
};

// Weekly Schedule data containing Locked Iron blocks and webhook integrations
const WEEKLY_SCHEDULE: Record<string, ScheduleItem[]> = {
  Monday: [
    { id: 'IT006-M', subject_name: 'IT 006 (Networking 1)', start_time: '07:30', end_time: '08:30', room: 'Room Q-5217C', instructor: 'TBA' },
    { id: 'IT009-M', subject_name: 'IT 009 (Systems Integration and Architecture 1)', start_time: '09:30', end_time: '10:30', room: 'Room Q-5409C', instructor: 'TBA' },
    { id: 'MATH304-M', subject_name: 'MATH 304 (Quantitative Methods)', start_time: '11:30', end_time: '12:30', room: 'Room Q-5212-E', instructor: 'TBA' },
    { id: 'GEE002-M', subject_name: 'GEE 002 (General Education Elective 2)', start_time: '13:30', end_time: '14:30', room: 'Room Q-5513', instructor: 'TBA' },
    { id: 'IT003-M', subject_name: 'IT 003 (Advanced Database Systems)', start_time: '14:30', end_time: '15:30', room: 'Room Q-5211D', instructor: 'TBA' },
    { id: 'IT021-M', subject_name: 'IT 021 (Usable Security)', start_time: '16:30', end_time: '17:30', room: 'Room Q-5208F', instructor: 'TBA', webhook_url: 'https://httpbin.org/post', webhook_method: 'POST' },
    { id: 'IT005-M', subject_name: 'IT 005 (Integrative Programming and Technologies)', start_time: '20:30', end_time: '21:30', room: 'Room Q-5212-C', instructor: 'TBA', webhook_url: 'https://httpbin.org/post', webhook_method: 'POST' },
  ],
  Tuesday: [
    { id: 'IT003-T', subject_name: 'IT 003 (Advanced Database Systems)', start_time: '12:30', end_time: '13:30', room: 'Room Q-5411', instructor: 'TBA' },
    { id: 'IT003L-T', subject_name: 'IT 003 (Advanced Database Systems - Lab)', start_time: '13:30', end_time: '16:30', room: 'Room Q-5203 Lab', instructor: 'TBA' },
    { id: 'TECH101-T', subject_name: 'TECH 101 (Technopreneurship)', start_time: '16:30', end_time: '18:00', room: 'Room Q-5409', instructor: 'TBA' },
  ],
  Wednesday: [
    { id: 'GEE002-W', subject_name: 'GEE 002 (General Education Elective 2)', start_time: '13:30', end_time: '14:30', room: 'Room Q-5513', instructor: 'TBA' },
    { id: 'IT005L-W', subject_name: 'IT 005 (Integrative Programming and Technologies - Lab)', start_time: '16:30', end_time: '19:30', room: 'Room Q-5213 Lab', instructor: 'TBA' },
    { id: 'IT005-W', subject_name: 'IT 005 (Integrative Programming and Technologies)', start_time: '19:30', end_time: '20:30', room: 'Room Q-5213', instructor: 'TBA' },
  ],
  Thursday: [
    { id: 'IT009-H', subject_name: 'IT 009 (Systems Integration and Architecture 1)', start_time: '09:30', end_time: '10:30', room: 'Room Q-5409', instructor: 'TBA' },
    { id: 'IT009L-H', subject_name: 'IT 009 (Systems Integration and Architecture 1 - Lab)', start_time: '10:30', end_time: '13:30', room: 'Room Q-5213 Lab', instructor: 'TBA' },
    { id: 'TECH101-H', subject_name: 'TECH 101 (Technopreneurship)', start_time: '16:30', end_time: '18:00', room: 'Room Q-5409', instructor: 'TBA' },
  ],
  Friday: [
    { id: 'GEE002-F', subject_name: 'GEE 002 (General Education Elective 2)', start_time: '13:30', end_time: '14:30', room: 'Room Q-5513', instructor: 'TBA' },
  ],
  Saturday: [
    { id: 'IT006L-S', subject_name: 'IT 006 (Networking 1 - Lab)', start_time: '07:30', end_time: '10:30', room: 'Room Q-9212 Lab', instructor: 'TBA' },
    { id: 'IT006-S', subject_name: 'IT 006 (Networking 1)', start_time: '10:30', end_time: '11:30', room: 'Room Q-9212', instructor: 'TBA' },
    { id: 'MATH304L-S', subject_name: 'MATH 304 (Quantitative Methods - Lab)', start_time: '11:30', end_time: '14:30', room: 'Room Q-5222 Lab', instructor: 'TBA' },
    { id: 'MATH304-S', subject_name: 'MATH 304 (Quantitative Methods)', start_time: '14:30', end_time: '15:30', room: 'Room Q-5222', instructor: 'TBA' },
    { id: 'IT021-S', subject_name: 'IT 021 (Usable Security)', start_time: '15:30', end_time: '16:30', room: 'Room Q-5208', instructor: 'TBA' },
    { id: 'IT021L-S', subject_name: 'IT 021 (Usable Security - Lab)', start_time: '16:30', end_time: '19:30', room: 'Room Q-5208 Lab', instructor: 'TBA' },
  ],
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function App() {
  // Theme state
  const [theme, setTheme] = useState<ThemeName>('dark');
  const themeConfig = useMemo(() => THEME_CONFIGS[theme], [theme]);

  // View state: timeline or vault or chat or control
  const [view, setView] = useState<'timeline' | 'vault' | 'chat' | 'control'>('timeline');

  // Firebase User & Settings Drawer states
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Synthesizer Sound effects state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('sylphy_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Alarm threshold configurations state
  const [deadlineSettings, setDeadlineSettings] = useState<{
    '1d': boolean;
    '12h': boolean;
    '6h': boolean;
    '1h': boolean;
  }>(() => {
    const saved = localStorage.getItem('sylphy_deadline_settings');
    return saved
      ? JSON.parse(saved)
      : { '1d': true, '12h': true, '6h': true, '1h': true };
  });

  // Dynamic Weekly Schedule state to support deletions and modifications
  const [schedule, setSchedule] = useState<Record<string, ScheduleItem[]>>(() => {
    const saved = localStorage.getItem('sylphy_schedule_v3');
    return saved ? JSON.parse(saved) : WEEKLY_SCHEDULE;
  });

  // Notes state
  const [notes, setNotes] = useState<Record<string, Note>>(() => {
    const saved = localStorage.getItem('sylphy_notes');
    return saved ? JSON.parse(saved) : {};
  });

  // Selected note/block properties
  const [selectedBlock, setSelectedBlock] = useState<ScheduleItem | null>(null);
  const [isNoteOpen, setIsNoteOpen] = useState<boolean>(false);

  const [spotifyToken, setSpotifyToken] = useState<string | null>(() => {
    const t = localStorage.getItem('spotify_token');
    return (t === 'null' || t === 'undefined' || !t) ? null : t;
  });

  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState<boolean>(false);
  const [addScheduleDefaultTab, setAddScheduleDefaultTab] = useState<'manual' | 'import'>('manual');
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const urlToken = params.get('spotify_token');

    // Intercept Spotify token passed back from 127.0.0.1 redirection
    if (urlToken && urlToken !== 'null' && urlToken !== 'undefined') {
      setSpotifyToken(urlToken);
      localStorage.setItem('spotify_token', urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // If browsing on 127.0.0.1 directly without an active Spotify code exchange, redirect to localhost to ensure Facebook compatibility
    if (window.location.hostname === '127.0.0.1' && !code) {
      window.location.href = window.location.href.replace('127.0.0.1', 'localhost');
    }
  }, []);

  useEffect(() => {
    // Intercept Spotify OAuth auth code from redirect search query parameters
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const verifier = params.get('state'); // The verifier is passed directly back in the state parameter!

    if (code && verifier) {
      const exchangeCodeForToken = async () => {

        const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
        let origin = window.location.origin;
        if (origin.includes('localhost')) {
          origin = origin.replace('localhost', '127.0.0.1');
        }
        const redirectUri = origin + '/';

        try {
          const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: clientId || '',
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: redirectUri,
              code_verifier: verifier,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const token = data.access_token;
            if (token) {
              // If we completed exchange on 127.0.0.1, redirect back to localhost passing the token in query string so it saves in localhost LocalStorage!
              if (window.location.hostname === '127.0.0.1') {
                window.location.href = `http://localhost:5181/?spotify_token=${token}`;
                return;
              }
              setSpotifyToken(token);
              localStorage.setItem('spotify_token', token);
            }
          } else {
            console.error('Failed to exchange Spotify authorization code:', await response.text());
          }
        } catch (error) {
          console.error('Spotify token exchange fetch error:', error);
        } finally {
          // Clear query params to keep address bar clean
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      exchangeCodeForToken();
    }
  }, []);

  const handleSpotifyDisconnect = useCallback(() => {
    setSpotifyToken(null);
    localStorage.removeItem('spotify_token');
  }, []);

  // Determine current day of week to set as initial tab
  const initialDay = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return DAYS_OF_WEEK.includes(today) ? today : 'Monday';
  }, []);

  const [activeDay, setActiveDay] = useState<string>(initialDay);
  const [baseTime, setBaseTime] = useState<Date>(new Date());
  const [timeOffset, setTimeOffset] = useState<number>(0); // manual offset slider in minutes
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 10x, 60x, 300x

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Desktop resize recovery listener: redirects 'chat' or 'control' to 'timeline' if screen becomes desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        if (view === 'chat' || view === 'control') {
          setView('timeline');
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [view]);

  // Browser HTML5 Notification Permission state
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // In-app notifications enabled status (default is false - OFF by default on first login/signup)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('sylphy_notifications_enabled');
    return saved !== null ? saved === 'true' : false;
  });

  const handleToggleNotifications = () => {
    if (permission !== 'granted') {
      handleRequestPermission();
      return;
    }
    setNotificationsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('sylphy_notifications_enabled', String(next));
      return next;
    });
  };

  const unsubscribeSnapshotRef = useRef<(() => void) | null>(null);

  // Sync to Cloud helper
  const syncToFirestore = async (newSchedule: any, newNotes: any) => {
    if (!auth.currentUser) return;
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'data', 'app');
      await setDoc(docRef, { schedule: newSchedule, notes: newNotes });
    } catch (e) {
      console.error('Failed to sync to Firestore:', e);
    }
  };

  // Open Soft Notification Permission Modal after onboarding or login if permissions are default
  useEffect(() => {
    if (user && !authLoading && !isWelcomeModalOpen && permission === 'default') {
      const dismissed = localStorage.getItem('sylphy_notification_modal_dismissed');
      if (dismissed !== 'true') {
        setIsPermissionModalOpen(true);
      }
    }
  }, [user, authLoading, isWelcomeModalOpen, permission]);

  // Sync FCM Push Token to Firestore when user logs in and grants permission
  useEffect(() => {
    if (!user) return;

    const syncFcmToken = async () => {
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        if (permission === 'granted') {
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
          if (!vapidKey) {
            console.warn('VITE_FIREBASE_VAPID_KEY is not defined in .env. Please generate a Web Push VAPID key in the Firebase Console under Cloud Messaging settings.');
            return;
          }

          const token = await getToken(messaging, { vapidKey });
          if (token) {
            const tokenDocRef = doc(db, 'users', user.uid, 'tokens', token);
            await setDoc(tokenDocRef, {
              token,
              deviceType: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
              updatedAt: new Date(),
            });
            console.log('FCM Token registered and synced to Firestore:', token);
          }
        }
      } catch (err) {
        console.error('Failed to retrieve or sync FCM token:', err);
      }
    };

    syncFcmToken();
  }, [user, permission]);

  // Firebase Auth and Firestore Snapshot Live Sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubscribeSnapshotRef.current) {
        unsubscribeSnapshotRef.current();
        unsubscribeSnapshotRef.current = null;
      }

      setUser(currentUser);

      if (currentUser) {
        setAuthLoading(true);
        const docRef = doc(db, 'users', currentUser.uid, 'data', 'app');
        
        unsubscribeSnapshotRef.current = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.schedule) setSchedule(data.schedule);
            if (data.notes) setNotes(data.notes);
          } else {
            // New user - start with empty schedule and trigger welcome onboarding modal
            setSchedule({});
            setIsWelcomeModalOpen(true);
          }
          setAuthLoading(false);
        }, (err) => {
          console.error('Firestore snapshot sync failed:', err);
          setAuthLoading(false);
        });
      } else {
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSchedule(WEEKLY_SCHEDULE);
      setNotes({});
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleUpdateProfile = async (displayName: string, photoURL: string) => {
    if (!auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser, { displayName, photoURL });
      setUser({
        ...auth.currentUser,
        displayName,
        photoURL
      });
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  };

  const handleAddSchedule = (newItem: any) => {
    setSchedule((prev) => {
      const dayList = prev[newItem.day] || [];
      const updatedDay = [...dayList, newItem];
      const updated = {
        ...prev,
        [newItem.day]: updatedDay
      };
      localStorage.setItem('sylphy_schedule_v3', JSON.stringify(updated));
      syncToFirestore(updated, notes);
      return updated;
    });
  };

  const handleAddMultipleSchedules = (newItems: any[]) => {
    setSchedule((prev) => {
      const updated = { ...prev };
      newItems.forEach(item => {
        const dayList = updated[item.day] || [];
        updated[item.day] = [...dayList, item];
      });
      localStorage.setItem('sylphy_schedule_v3', JSON.stringify(updated));
      syncToFirestore(updated, notes);
      return updated;
    });
  };

  const handleSkipOnboarding = async () => {
    setIsWelcomeModalOpen(false);
    if (auth.currentUser) {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'data', 'app');
      try {
        await setDoc(docRef, {
          schedule: WEEKLY_SCHEDULE,
          notes: {},
        });
        setSchedule(WEEKLY_SCHEDULE);
        addToast('system', 'Demo Schedule Loaded', 'Default demo classes loaded.', 'SYSTEM');
      } catch (err) {
        console.error('Failed to seed onboarding:', err);
      }
    }
  };

  const handleGetStartedOnboarding = () => {
    setIsWelcomeModalOpen(false);
    setAddScheduleDefaultTab('import');
    setIsAddScheduleOpen(true);
  };

  // Refs for tracking time differences and silent updates on jumps
  const lastTimeRef = useRef<Date | null>(null);
  const prevDayRef = useRef<string>(activeDay);
  const [prevActiveEventId, setPrevActiveEventId] = useState<string | null>(null);
  const [lastCheckedMinutes, setLastCheckedMinutes] = useState<number>(-1);

  const activeDaySchedule = useMemo(() => {
    return schedule[activeDay] || [];
  }, [schedule, activeDay]);

  // Helper to trigger HTML5 Browser Push Notifications (with Service Worker fallback for iOS/Android phones)
  const sendPushNotification = useCallback((title: string, body: string, requireInteraction = false) => {
    if (permission !== 'granted' || !notificationsEnabled) return;
    try {
      const options: NotificationOptions = {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        requireInteraction,
      };
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, options);
        }).catch(() => {
          new Notification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    } catch (err) {
      console.warn('Failed to send HTML5 push notification:', err);
    }
  }, [permission, notificationsEnabled]);

  // Request browser notification permission
  const handleRequestPermission = () => {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission().then((res) => {
      setPermission(res);
      if (res === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('sylphy_notifications_enabled', 'true');
      }
    });
  };

  // Add toast alert handler
  const addToast = (
    type: 'start' | 'end' | 'system',
    title: string,
    message: string,
    subjectName: string
  ) => {
    const match = subjectName.match(/^([A-Z]+\s+\d+)/i);
    const code = match ? match[1].toUpperCase() : subjectName;

    let borderColorClass = 'border-l-cyber-cyan';
    let dotColor = 'text-cyber-cyan';

    switch (code) {
      case 'IT 006':
        borderColorClass = 'border-l-cyan-400';
        dotColor = 'text-cyan-400';
        break;
      case 'IT 009':
        borderColorClass = 'border-l-purple-400';
        dotColor = 'text-purple-400';
        break;
      case 'MATH 304':
        borderColorClass = 'border-l-indigo-400';
        dotColor = 'text-indigo-400';
        break;
      case 'GEE 002':
        borderColorClass = 'border-l-slate-300';
        dotColor = 'text-slate-300';
        break;
      case 'IT 003':
        borderColorClass = 'border-l-lime-400';
        dotColor = 'text-lime-400';
        break;
      case 'IT 021':
        borderColorClass = 'border-l-rose-400';
        dotColor = 'text-rose-400';
        break;
      case 'IT 005':
        borderColorClass = 'border-l-emerald-400';
        dotColor = 'text-emerald-400';
        break;
      case 'TECH 101':
        borderColorClass = 'border-l-amber-400';
        dotColor = 'text-amber-400';
        break;
      default:
        break;
    }

    const newToast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
      borderColorClass,
      dotColor,
      timestamp: new Date(),
    };

    setToasts((prev) => [newToast, ...prev]);

    // Synthesize local Audio Alert Chime
    if (soundEnabled) {
      playNotificationSound(type);
    }

    // HTML5 browser notification (pops up if permitted)
    sendPushNotification(title, message);
  };

  const handleRemoveToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Reset offset and simulation settings
  const handleResetTime = () => {
    setTimeOffset(0);
    setBaseTime(new Date());
    setIsSimulating(false);
    setSimSpeed(1);
    addToast('system', 'Timeline Sync', 'Clock synced to active system time.', 'SYSTEM');
  };

  // Real-time ticking effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (isSimulating) {
        // Accelerate offset
        setTimeOffset((prev) => prev + (simSpeed * 1) / 10);
      } else {
        // Standard real-time update
        setBaseTime(new Date());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeed]);

  // The calculated virtual current time
  const currentTime = useMemo(() => {
    const date = new Date(baseTime);
    date.setMinutes(date.getMinutes() + timeOffset);
    return date;
  }, [baseTime, timeOffset]);

  const weather = useWeather(currentTime);
  const dailyInspiration = useMemo(() => getDailyInspiration(currentTime), [currentTime]);

  // Adjust activeDay automatically to system time weekday if timeOffset is 0 or on mount/session loads
  useEffect(() => {
    if (timeOffset === 0) {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      if (DAYS_OF_WEEK.includes(today)) {
        setActiveDay(today);
      }
    }
  }, [timeOffset, user, authLoading]);



  const getSubjectNameByScheduleId = (scheduleId: string): string => {
    for (const day of Object.values(schedule)) {
      const item = day.find((i) => i.id === scheduleId);
      if (item) return item.subject_name;
    }
    return 'General Task';
  };

  // Transition detection effect for starts & ends
  useEffect(() => {
    const currentMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Sort items chronologically
    const sorted = [...activeDaySchedule].sort(
      (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );

    // Find the currently active event
    const activeEvent = sorted.find(
      (item) => currentMin >= timeToMinutes(item.start_time) && currentMin < timeToMinutes(item.end_time)
    );

    const activeEventId = activeEvent ? activeEvent.id : null;
    const prevTime = lastTimeRef.current;
    lastTimeRef.current = currentTime;

    // Detect manual time warps or day changes
    const timeDeltaMs = prevTime ? Math.abs(currentTime.getTime() - prevTime.getTime()) : 0;
    const dayChanged = activeDay !== prevDayRef.current;
    prevDayRef.current = activeDay;

    // If manual jump occurred (e.g. delta > 10m in simulated time) or tab day was switched, update silently
    if (timeDeltaMs > 10 * 60 * 1000 || dayChanged) {
      setPrevActiveEventId(activeEventId);
      setLastCheckedMinutes(Math.floor(currentMin));
      return;
    }

    // Only alert on distinct minute changes
    if (Math.floor(currentMin) === lastCheckedMinutes) {
      return;
    }
    setLastCheckedMinutes(Math.floor(currentMin));

    // Case 0: Chrono-notification every 2 hours when inspiration shifts
    const hoursSinceEpoch = Math.floor(currentTime.getTime() / (1000 * 60 * 60));
    const currentInterval = Math.floor(hoursSinceEpoch / 2);
    const lastSentInterval = localStorage.getItem('sylphy_last_inspiration_interval');
    if (lastSentInterval !== currentInterval.toString()) {
      localStorage.setItem('sylphy_last_inspiration_interval', currentInterval.toString());
      
      // Dispatch internal App toast
      addToast(
        'system',
        'New Inspiration',
        `"${dailyInspiration.verse}" — ${dailyInspiration.verseReference}`,
        'SYSTEM'
      );

      // Dispatch browser push notification
      sendPushNotification(
        "New Inspiration & Quote",
        `Verse: "${dailyInspiration.verse}" (${dailyInspiration.verseReference})\n\nQuote: "${dailyInspiration.quote}" (${dailyInspiration.quoteAuthor})`,
        true
      );
    }

    // Case 0.5: Task Deadline Notifications (1d, 12h, 6h, 1h before)
    Object.values(notes).forEach((note) => {
      if (note.deadline && !note.is_done) {
        const dl = new Date(note.deadline).getTime();
        const diffMs = dl - currentTime.getTime();
        const notified = note.notified_thresholds || [];

        // Helper to trigger alert and update note notified list
        const triggerDeadlineAlert = (thresholdKey: '1d' | '12h' | '6h' | '1h', timeLabel: string) => {
          // Toast
          addToast(
            'system',
            'Task Deadline Approaching',
            `"${note.title}" for ${getSubjectNameByScheduleId(note.schedule_id)} is due in ${timeLabel}.`,
            'SYSTEM'
          );

          // Push
          sendPushNotification(
            "Task Deadline Approaching",
            `"${note.title}" is due in ${timeLabel}.\nSubject: ${getSubjectNameByScheduleId(note.schedule_id)}`,
            true
          );

          // Save list
          setNotes((prev) => {
            const currentNote = prev[note.schedule_id];
            if (!currentNote) return prev;
            const updatedNote = {
              ...currentNote,
              notified_thresholds: [...(currentNote.notified_thresholds || []), thresholdKey],
            };
            const updated = {
              ...prev,
              [note.schedule_id]: updatedNote,
            };
            localStorage.setItem('sylphy_notes', JSON.stringify(updated));
            return updated;
          });
        };

        // Check difference thresholds (respecting user-configured deadlineSettings)
        if (diffMs > 0) {
          if (diffMs <= 1 * 60 * 60 * 1000 && !notified.includes('1h') && deadlineSettings['1h']) {
            triggerDeadlineAlert('1h', 'less than 1 hour');
          } else if (diffMs <= 6 * 60 * 60 * 1000 && !notified.includes('6h') && diffMs > 1 * 60 * 60 * 1000 && deadlineSettings['6h']) {
            triggerDeadlineAlert('6h', 'less than 6 hours');
          } else if (diffMs <= 12 * 60 * 60 * 1000 && !notified.includes('12h') && diffMs > 6 * 60 * 60 * 1000 && deadlineSettings['12h']) {
            triggerDeadlineAlert('12h', 'less than 12 hours');
          } else if (diffMs <= 24 * 60 * 60 * 1000 && !notified.includes('1d') && diffMs > 12 * 60 * 60 * 1000 && deadlineSettings['1d']) {
            triggerDeadlineAlert('1d', 'less than 24 hours');
          }
        }
      }
    });

    // Case 1: Event Ended
    if (prevActiveEventId !== null && activeEventId !== prevActiveEventId) {
      const oldEvent = sorted.find((e) => e.id === prevActiveEventId);
      const lastAlertedEnd = localStorage.getItem('sylphy_last_alerted_end_id');
      if (oldEvent && lastAlertedEnd !== prevActiveEventId) {
        localStorage.setItem('sylphy_last_alerted_end_id', prevActiveEventId);
        addToast(
          'end',
          'Class Ended',
          `"${oldEvent.subject_name}" has finished.`,
          oldEvent.subject_name
        );
      }
    }

    // Case 2: Event Started
    if (activeEventId !== null && activeEventId !== prevActiveEventId && activeEvent) {
      const lastAlertedStart = localStorage.getItem('sylphy_last_alerted_start_id');
      if (lastAlertedStart !== activeEventId) {
        localStorage.setItem('sylphy_last_alerted_start_id', activeEventId);
        addToast(
          'start',
          'Class Started',
          `"${activeEvent.subject_name}" is starting now in ${activeEvent.room || 'TBD'} with ${activeEvent.instructor || 'TBD'}.`,
          activeEvent.subject_name
        );

        // CHRONO-NOTIFICATIONS: Desktop/Mobile push notification
        sendPushNotification(
          `Focus Block Started: ${activeEvent.subject_name}`,
          `Room: ${activeEvent.room || 'TBD'} • Instructor: ${activeEvent.instructor || 'TBD'}`
        );
      }
    }

    setPrevActiveEventId(activeEventId);
  }, [currentTime, activeDaySchedule, activeDay, prevActiveEventId, lastCheckedMinutes, permission, dailyInspiration, notes]);

  // Initialize last alerted start ID to the active class on load so we don't spam start alerts
  useEffect(() => {
    const currentMin = new Date().getHours() * 60 + new Date().getMinutes();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const activeDaySchedule = schedule[today] || [];
    const activeEvent = activeDaySchedule.find(
      (item) => currentMin >= timeToMinutes(item.start_time) && currentMin < timeToMinutes(item.end_time)
    );
    if (activeEvent) {
      localStorage.setItem('sylphy_last_alerted_start_id', activeEvent.id);
    }
  }, [schedule]);

  // Click handler to open Markdown notes slide-over
  const handleBlockClick = (block: any) => {
    if (block.type === 'gap') return;
    const item = activeDaySchedule.find((item) => item.id === block.id);
    if (item) {
      setSelectedBlock(item);
      setIsNoteOpen(true);
    }
  };

  // Save notes locally and in cloud
  const handleSaveNote = (scheduleId: string, noteData: { title: string; content: string; deadline?: string }) => {
    setNotes((prev) => {
      const existing = prev[scheduleId];
      const updatedNote = {
        id: existing?.id || Math.random().toString(36).substring(2, 9),
        schedule_id: scheduleId,
        title: noteData.title,
        content: noteData.content,
        deadline: noteData.deadline,
        is_done: existing?.is_done ?? false,
        notified_thresholds: existing?.notified_thresholds ?? [],
      };
      const updated = {
        ...prev,
        [scheduleId]: updatedNote,
      };
      localStorage.setItem('sylphy_notes', JSON.stringify(updated));
      syncToFirestore(schedule, updated);
      return updated;
    });
  };

  const handleToggleNoteDone = (noteId: string) => {
    setNotes((prev) => {
      const list = Object.values(prev);
      const target = list.find((n) => n.id === noteId);
      if (!target) return prev;
      
      const updatedNote = {
        ...target,
        is_done: !target.is_done,
        notified_thresholds: target.notified_thresholds || [],
      };
      
      const updated = {
        ...prev,
        [target.schedule_id]: updatedNote,
      };
      localStorage.setItem('sylphy_notes', JSON.stringify(updated));
      syncToFirestore(schedule, updated);
      return updated;
    });
  };



  const handleDeleteNoteFromVault = (scheduleId: string) => {
    setNotes((prev) => {
      const updated = { ...prev };
      delete updated[scheduleId];
      localStorage.setItem('sylphy_notes', JSON.stringify(updated));
      syncToFirestore(schedule, updated);
      return updated;
    });
  };

  // Delete notes and schedule block items
  const handleDeleteBlockRequest = (item: ScheduleItem) => {
    performDeleteBlock(item);
  };

  const performDeleteBlock = (item: ScheduleItem) => {
    let finalSchedule = schedule;
    let finalNotes = notes;

    setSchedule((prev) => {
      const updatedDaySchedule = (prev[activeDay] || []).filter((i) => i.id !== item.id);
      const updated = {
        ...prev,
        [activeDay]: updatedDaySchedule,
      };
      localStorage.setItem('sylphy_schedule_v3', JSON.stringify(updated));
      finalSchedule = updated;
      return updated;
    });
    
    // Clear note references
    setNotes((prev) => {
      const updated = { ...prev };
      delete updated[item.id];
      localStorage.setItem('sylphy_notes', JSON.stringify(updated));
      finalNotes = updated;
      
      syncToFirestore(finalSchedule, finalNotes);
      return updated;
    });

    setIsNoteOpen(false);
    setSelectedBlock(null);
    addToast('system', 'Block Removed', `"${item.subject_name}" has been successfully removed.`, 'SYSTEM');
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0c] flex flex-col items-center justify-center gap-3 select-none">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="font-mono text-[10px] tracking-[0.25em] text-slate-500 uppercase">
          Syncing Session...
        </span>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className={`flex h-screen w-screen overflow-hidden select-none relative z-10 transition-colors duration-500 ${themeConfig.bgClass}`}>
      
      {/* Settings slide-over */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        setTheme={setTheme}
        themeConfig={themeConfig}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleNotifications}
        notificationPermission={permission}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        deadlineSettings={deadlineSettings}
        setDeadlineSettings={setDeadlineSettings}
        onUpdateProfile={handleUpdateProfile}
      />

      {/* Floating Background Liquid Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-[130px] animate-float-slow transition-colors duration-1000 ${themeConfig.blobColors[0]}`} />
        <div className={`absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full blur-[160px] animate-float-delayed transition-colors duration-1000 ${themeConfig.blobColors[1]}`} />
        <div className={`absolute -bottom-20 -right-20 w-[450px] h-[450px] rounded-full blur-[120px] animate-float-slow transition-colors duration-1000 ${themeConfig.blobColors[2]}`} />
      </div>

      {/* Toast Overlay notifications */}
      <ToastNotification toasts={toasts} onRemoveToast={handleRemoveToast} themeConfig={themeConfig} />



      {/* Context Notes side-panel */}
      <NoteEngine
        isOpen={isNoteOpen}
        onClose={() => {
          setIsNoteOpen(false);
          setSelectedBlock(null);
        }}
        scheduleItem={selectedBlock}
        note={selectedBlock ? (notes[selectedBlock.id] || null) : null}
        onSaveNote={(noteData) => {
          if (selectedBlock) handleSaveNote(selectedBlock.id, noteData);
        }}
        onDeleteBlock={handleDeleteBlockRequest}
        themeConfig={themeConfig}
      />

      {/* LEFT PANE: 100% on mobile, 70% viewport width on desktop (Frosted Glass panel) */}
      <motion.div
        className={`w-full lg:w-[70%] h-full flex flex-col border-r bg-white/[0.01] backdrop-blur-md lg:backdrop-blur-none z-10 transition-colors duration-500
          ${themeConfig.panelClass}
        `}
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 60, damping: 14, delay: 0.1 }}
      >
        {/* Responsive Header Day selection tabs */}
        <div className={`w-full bg-white/[0.02] backdrop-blur-md border-b px-3 md:px-6 py-3 flex items-center justify-between gap-2 md:gap-4 transition-colors duration-500 ${themeConfig.borderClass}`}>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className={`flex items-center gap-1.5 md:gap-2 font-mono text-xs font-bold tracking-widest uppercase transition-colors duration-500 ${themeConfig.accentTextClass}`}>
              <span className="shrink-0">
                {view === 'timeline' && <Calendar className="w-4 h-4" />}
                {view === 'vault' && <ClipboardList className="w-4 h-4" />}
                {view === 'chat' && <MessageSquare className="w-4 h-4" />}
                {view === 'control' && <SlidersHorizontal className="w-4 h-4" />}
              </span>
              <span className="hidden lg:inline">SylphySched Weekly</span>
              <span className="lg:hidden">
                {view === 'timeline' && 'Sylphy'}
                {view === 'vault' && 'Notes'}
                {view === 'chat' && 'Sylphy Chat'}
                {view === 'control' && 'Control'}
              </span>
            </div>
            {/* View Toggle */}
            <div className={`hidden lg:flex bg-matte-black/40 border rounded-full p-0.5 transition-colors duration-500 ${themeConfig.borderClass} shrink-0`}>
              <button
                onClick={() => setView('timeline')}
                className={`px-2 md:px-3 py-1 text-[8px] md:text-[8.5px] font-mono tracking-wider rounded-full cursor-pointer transition-all duration-300
                  ${view === 'timeline'
                    ? `${themeConfig.name === 'dark' ? 'bg-white/[0.08] text-cyber-cyan font-bold border border-white/10 shadow-[0_0_8px_rgba(0,229,255,0.15)]' : 'bg-slate-900 text-white font-bold border border-slate-900/10'}`
                    : `${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass} hover:bg-white/[0.03]`
                  }
                `}
              >
                TIMELINE
              </button>
              <button
                onClick={() => setView('vault')}
                className={`px-2 md:px-3 py-1 text-[8px] md:text-[8.5px] font-mono tracking-wider rounded-full cursor-pointer transition-all duration-300
                  ${view === 'vault'
                    ? `${themeConfig.name === 'dark' ? 'bg-white/[0.08] text-cyber-cyan font-bold border border-white/10 shadow-[0_0_8px_rgba(0,229,255,0.15)]' : 'bg-slate-900 text-white font-bold border border-slate-900/10'}`
                    : `${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass} hover:bg-white/[0.03]`
                  }
                `}
              >
                NOTES
              </button>
            </div>
            <div className="hidden lg:block shrink-0">
              <WeatherWidget weather={weather} themeConfig={themeConfig} />
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
            <div className="lg:hidden shrink-0">
              <WeatherWidget weather={weather} themeConfig={themeConfig} />
            </div>

            {/* Add Class Button */}
            {view === 'timeline' && (
              <button
                onClick={() => {
                  setAddScheduleDefaultTab('manual');
                  setIsAddScheduleOpen(true);
                }}
                className={`hidden md:flex items-center justify-center p-1.5 border rounded-full hover:opacity-95 transition-all duration-300 cursor-pointer shadow-sm shrink-0
                  ${themeConfig.name === 'dark' 
                    ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-cyber-cyan' 
                    : 'bg-slate-900 text-white border-slate-900/10 hover:bg-slate-800'
                  }
                `}
                title="Add Class Schedule"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}



            {/* Mobile-only diagnostics header button */}
            <button
              onClick={() => setView('control')}
              className={`lg:hidden flex items-center justify-center p-1.5 bg-white/[0.04] border rounded-full hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0 ${themeConfig.borderClass} ${themeConfig.textMutedClass}`}
              title="Open Diagnostics"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Profile Avatar Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`w-7 h-7 rounded-full border flex items-center justify-center overflow-hidden cursor-pointer shadow-sm transition-all duration-300 hover:scale-105 active:scale-95 shrink-0
                ${themeConfig.name === 'dark' ? 'border-white/10 bg-white/[0.03]' : 'border-slate-900/10 bg-slate-900/[0.03]'}
              `}
              title="Open Settings"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profile'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className={`w-3.5 h-3.5 ${themeConfig.textDarkClass}`} />
              )}
            </button>
          </div>
        </div>

        {/* Sub-header with Day Selection Tabs (Timeline view only, responsive and scroll-safe) */}
        {view === 'timeline' && (
          <div className={`w-full bg-white/[0.02] backdrop-blur-md border-b py-2.5 px-4 overflow-x-auto flex justify-center shrink-0 transition-colors duration-500 ${themeConfig.borderClass}`}>
            <div className={`flex bg-matte-black/40 border rounded-full p-1 overflow-x-auto scrollbar-none flex-nowrap shrink-0 transition-colors duration-500 ${themeConfig.borderClass}`}>
              {DAYS_OF_WEEK.map((day) => {
                const isActive = activeDay === day;
                const hasClasses = (schedule[day] || []).length > 0;
                
                const activeBtnStyle = isActive
                  ? theme === 'dark'
                    ? 'bg-white/[0.08] text-cyber-cyan font-bold border border-white/10 shadow-[0_0_8px_rgba(0,229,255,0.15)]'
                    : theme === 'light'
                      ? 'bg-slate-900 text-white font-bold border border-slate-900/10 shadow-sm'
                      : theme === 'pink'
                        ? 'bg-pink-500 text-white font-bold border border-pink-500/25 shadow-sm'
                        : 'bg-sky-600 text-white font-bold border border-sky-500/25 shadow-sm'
                  : `${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass} hover:bg-white/[0.03]`;

                return (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-3.5 py-1 text-[9.5px] font-mono tracking-wider rounded-full cursor-pointer transition-all duration-300 shrink-0
                      ${activeBtnStyle}
                      ${!hasClasses && 'opacity-40'}
                    `}
                  >
                    {day.slice(0, 3).toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline or Vault block area */}
        <div className="flex-1 overflow-hidden relative pb-24 lg:pb-0">
          {view === 'timeline' && (
            <AscendingTimeline
              scheduleItems={activeDaySchedule}
              currentTime={currentTime}
              themeConfig={themeConfig}
              onBlockClick={handleBlockClick}
              userName={user?.displayName}
            />
          )}
          {view === 'vault' && (
            <NoteVault
              notes={notes}
              schedule={schedule}
              onToggleDone={handleToggleNoteDone}
              onDeleteNote={handleDeleteNoteFromVault}
              onSaveNote={handleSaveNote}
              themeConfig={themeConfig}
              currentTime={currentTime}
            />
          )}
          {view === 'chat' && (
            <SylphyChat
              schedule={schedule}
              userName={user?.displayName}
              themeConfig={themeConfig}
              mode="inline"
            />
          )}
          {view === 'control' && (
            <ControlPanel
              currentTime={currentTime}
              scheduleItems={activeDaySchedule}
              isSimulating={isSimulating}
              setIsSimulating={setIsSimulating}
              simSpeed={simSpeed}
              setSimSpeed={setSimSpeed}
              onResetTime={handleResetTime}
              onTimeOffsetChange={setTimeOffset}
              timeOffset={timeOffset}
              notificationPermission={permission}
              notificationsEnabled={notificationsEnabled}
              themeConfig={themeConfig}
              dailyInspiration={dailyInspiration}
              spotifyToken={spotifyToken}
              onSpotifyConnect={setSpotifyToken}
              onSpotifyDisconnect={handleSpotifyDisconnect}
              mode="inline"
            />
          )}
        </div>
      </motion.div>

      {/* DESKTOP RIGHT PANE: Inline 30% width, hidden on mobile (Glass sidebar) */}
      <motion.div
        className={`hidden lg:block lg:w-[30%] h-full bg-white/[0.01] backdrop-blur-xl border-l z-10 transition-colors duration-500
          ${themeConfig.panelClass}
        `}
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 60, damping: 14, delay: 0.2 }}
      >
        <ControlPanel
          currentTime={currentTime}
          scheduleItems={activeDaySchedule}
          isSimulating={isSimulating}
          setIsSimulating={setIsSimulating}
          simSpeed={simSpeed}
          setSimSpeed={setSimSpeed}
          onResetTime={handleResetTime}
          onTimeOffsetChange={setTimeOffset}
          timeOffset={timeOffset}
          notificationPermission={permission}
          notificationsEnabled={notificationsEnabled}
          themeConfig={themeConfig}
          dailyInspiration={dailyInspiration}
          spotifyToken={spotifyToken}
          onSpotifyConnect={setSpotifyToken}
          onSpotifyDisconnect={handleSpotifyDisconnect}
        />
      </motion.div>

      {/* Add Class Importer Modal */}
      <AddScheduleModal
        isOpen={isAddScheduleOpen}
        onClose={() => setIsAddScheduleOpen(false)}
        themeConfig={themeConfig}
        onAddSingle={handleAddSchedule}
        onAddMultiple={handleAddMultipleSchedules}
        addToast={addToast}
        defaultTab={addScheduleDefaultTab}
      />

      {/* Onboarding Welcome Modal */}
      <WelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        onGetStarted={handleGetStartedOnboarding}
        onSkip={handleSkipOnboarding}
        themeConfig={themeConfig}
        userName={user?.displayName}
      />

      {/* Soft Notification Permission Modal */}
      <NotificationPermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => {
          localStorage.setItem('sylphy_notification_modal_dismissed', 'true');
          setIsPermissionModalOpen(false);
        }}
        onConfirm={() => {
          handleRequestPermission();
          setIsPermissionModalOpen(false);
        }}
        themeConfig={themeConfig}
      />

      {/* Sylphy AI Chatbot Assistant (Desktop Floating) */}
      <div className="hidden lg:block">
        <SylphyChat
          schedule={schedule}
          userName={user?.displayName}
          themeConfig={themeConfig}
          isOpen={isChatOpen}
          onToggleOpen={() => setIsChatOpen((prev) => !prev)}
          mode="floating"
        />
      </div>

      {/* MOBILE FLOATING DOCK (TikTok-style centered navigation) */}
      <div className={`lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-5 py-2 rounded-full border backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-500
        ${theme === 'dark' 
          ? 'bg-[#0c0c0e]/80 border-white/10 shadow-[0_0_20px_rgba(0,229,255,0.05)]' 
          : 'bg-white/80 border-slate-900/10'
        }
      `}>
        {/* Tab 1: Schedule/Timeline */}
        <button
          onClick={() => setView('timeline')}
          className={`p-2 rounded-full cursor-pointer transition-all duration-300 active:scale-90 flex items-center justify-center
            ${view === 'timeline' 
              ? 'text-cyan-400 bg-white/[0.04] shadow-[0_0_12px_rgba(6,182,212,0.15)] border border-white/5' 
              : `${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass} hover:bg-white/[0.01]`
            }
          `}
          title="Schedule"
        >
          <Calendar className="w-5 h-5" />
        </button>

        {/* Tab 2: Notes */}
        <button
          onClick={() => setView('vault')}
          className={`p-2 rounded-full cursor-pointer transition-all duration-300 active:scale-90 flex items-center justify-center
            ${view === 'vault' 
              ? 'text-cyan-400 bg-white/[0.04] shadow-[0_0_12px_rgba(6,182,212,0.15)] border border-white/5' 
              : `${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass} hover:bg-white/[0.01]`
            }
          `}
          title="Notes"
        >
          <ClipboardList className="w-5 h-5" />
        </button>

        {/* Tab 3: Chatbot trigger */}
        <button
          onClick={() => setView('chat')}
          className={`p-2 rounded-full cursor-pointer transition-all duration-300 active:scale-90 flex items-center justify-center
            ${view === 'chat' 
              ? 'text-cyan-400 bg-white/[0.04] shadow-[0_0_12px_rgba(6,182,212,0.15)] border border-white/5' 
              : `${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass} hover:bg-white/[0.01]`
            }
          `}
          title="Chat with Sylphy"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Tab 4: Diagnostics Panel trigger */}
        <button
          onClick={() => setView('control')}
          className={`p-2 rounded-full cursor-pointer transition-all duration-300 active:scale-90 flex items-center justify-center
            ${view === 'control' 
              ? 'text-cyan-400 bg-white/[0.04] shadow-[0_0_12px_rgba(6,182,212,0.15)] border border-white/5' 
              : `${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass} hover:bg-white/[0.01]`
            }
          `}
          title="Open Control Panel"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Action Button for Adding Class Schedule on Mobile */}
      {view === 'timeline' && (
        <button
          onClick={() => {
            setAddScheduleDefaultTab('manual');
            setIsAddScheduleOpen(true);
          }}
          className={`lg:hidden fixed bottom-24 right-6 z-30 w-12 h-12 rounded-full border shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer
            ${theme === 'dark' 
              ? 'bg-[#0c0c0e]/90 border-white/10 text-cyber-cyan shadow-[0_8px_30px_rgba(0,229,255,0.2)]' 
              : 'bg-white border-slate-900/10 text-slate-900 hover:bg-slate-50'
            }
          `}
          title="Add Class Schedule"
        >
          <Plus className="w-5 h-5" />
        </button>
      )}

    </div>
  );
}

export default App;
