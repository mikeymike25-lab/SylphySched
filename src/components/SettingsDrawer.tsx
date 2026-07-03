import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Settings, User, Bell, Clock, RotateCcw, AlertTriangle, Edit3, Camera, Save, Loader2 } from 'lucide-react';
import type { ThemeName, ThemeConfig } from '../types';

interface LiquidGlassSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

export const LiquidGlassSwitch: React.FC<LiquidGlassSwitchProps> = ({ checked, onChange, disabled }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      disabled={disabled}
      className={`w-11 h-6 rounded-full p-0.5 backdrop-blur-md border transition-all duration-300 flex items-center cursor-pointer select-none relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)]
        ${checked ? 'justify-end' : 'justify-start'}
        ${disabled 
          ? 'opacity-40 cursor-not-allowed border-white/5 bg-white/5' 
          : checked 
            ? 'border-cyan-500/30 bg-cyan-500/20 shadow-[0_0_15px_rgba(0,229,255,0.2),inset_0_1px_2px_rgba(0,0,0,0.4)] hover:border-cyan-500/40' 
            : 'border-white/10 bg-white/[0.03] shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] hover:border-white/15'
        }
      `}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        className={`w-4.5 h-4.5 rounded-full border backdrop-blur-lg transition-colors duration-300
          ${checked 
            ? 'bg-white/[0.7] border-white/70 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.7),0_2px_6px_rgba(0,0,0,0.3)]' 
            : 'bg-white/[0.15] border-white/40 shadow-[inset_0_0.75px_1px_rgba(255,255,255,0.5),0_2px_6px_rgba(0,0,0,0.3)]'
          }
        `}
      />
    </button>
  );
};

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any; // User type from Firebase Auth
  onLogout: () => void;
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themeConfig: ThemeConfig;
  
  // Notification & Alert states
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  notificationPermission: NotificationPermission;
  
  // Sound states
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  
  // Alarm Thresholds
  deadlineSettings: {
    '1d': boolean;
    '12h': boolean;
    '6h': boolean;
    '1h': boolean;
  };
  setDeadlineSettings: React.Dispatch<React.SetStateAction<{
    '1d': boolean;
    '12h': boolean;
    '6h': boolean;
    '1h': boolean;
  }>>;
  onUpdateProfile: (displayName: string, photoURL: string) => Promise<void>;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  theme,
  setTheme,
  themeConfig,
  notificationsEnabled,
  onToggleNotifications,
  notificationPermission,
  soundEnabled,
  setSoundEnabled,
  deadlineSettings,
  setDeadlineSettings,
  onUpdateProfile,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editPhotoUrl, setEditPhotoUrl] = useState(user?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sync edits when user details change or drawer is opened
  useEffect(() => {
    if (user && isOpen) {
      setEditName(user.displayName || '');
      setEditPhotoUrl(user.photoURL || '');
      setUploadError(null);
    }
  }, [user, isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to resize to 128x128 center crop
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);
          
          try {
            const compressedUrl = canvas.toDataURL('image/jpeg', 0.7);
            setEditPhotoUrl(compressedUrl);
            setUploadError(null);
          } catch (err) {
            setUploadError('Failed to process image');
          }
        }
      };
      img.onerror = () => {
        setUploadError('Failed to load image file');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setUploadError('Display name is required');
      return;
    }
    setIsSaving(true);
    try {
      await onUpdateProfile(editName.trim(), editPhotoUrl);
      setIsEditing(false);
      setUploadError(null);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeadlineToggle = (key: '1d' | '12h' | '6h' | '1h') => {
    setDeadlineSettings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('sylphy_deadline_settings', JSON.stringify(next));
      return next;
    });
  };

  const handleClearCache = () => {
    if (window.confirm('This will reset your local browser cache and reload the application. Your notes and schedules will remain safe in Firestore. Proceed?')) {
      localStorage.clear();
      window.location.reload();
    }
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

          {/* Settings Drawer (Liquid Glass iOS style) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 130, damping: 20 }}
            className={`fixed inset-y-0 right-0 z-45 w-full sm:w-[380px] h-full shadow-[0_0_50px_rgba(0,0,0,0.8)] border-l backdrop-blur-2xl p-6 flex flex-col justify-between select-none pointer-events-auto transition-colors duration-500
              ${themeConfig.name === 'dark' ? 'bg-[#0f0f11]/80 border-white/10' : 'bg-white/85 border-slate-900/10'}
            `}
          >
            {/* Header */}
            <div className={`flex flex-col gap-1 border-b pb-4 mb-5 shrink-0 ${themeConfig.borderClass}`}>
              <div className="flex items-center justify-between">
                <span className={`font-mono text-[10px] tracking-[0.2em] font-bold ${themeConfig.accentTextClass}`}>
                  System Preferences
                </span>
                <button
                  onClick={onClose}
                  className={`p-1.5 rounded-full hover:bg-white/[0.04] transition-all cursor-pointer ${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Settings className={`w-4 h-4 ${themeConfig.accentTextClass}`} />
                <h2 className={`text-base font-bold uppercase truncate ${themeConfig.textBrightClass}`}>
                  App Customization
                </h2>
              </div>
            </div>

            {/* Main Scrollable Content Area */}
            <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1 scrollbar-thin">
              
              {/* User Profile Card */}
              <div className={`border p-4 rounded-[22px] flex flex-col gap-3 backdrop-blur-md bg-white/[0.01] transition-all duration-300 relative
                ${themeConfig.name === 'dark' ? 'border-white/5 bg-matte-black/20' : 'border-slate-900/5 bg-slate-900/[0.02]'}
              `}>
                {isEditing ? (
                  /* EDITING MODE */
                  <div className="w-full flex flex-col items-center gap-3">
                    <div className="relative group cursor-pointer w-14 h-14 rounded-full overflow-hidden border border-white/20">
                      {editPhotoUrl ? (
                        <img src={editPhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/5 text-slate-400">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      
                      <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                        <Camera className="w-4 h-4 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="w-full flex flex-col gap-1.5 text-left">
                      <label className={`font-mono text-[8px] uppercase tracking-wider ${themeConfig.textDarkClass}`}>Display Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-sans border outline-none
                          ${themeConfig.name === 'dark'
                            ? 'bg-matte-black border-white/10 text-white focus:border-cyan-500/50'
                            : 'bg-white border-slate-900/10 text-slate-900 focus:border-slate-900/30'
                          }
                        `}
                      />
                    </div>

                    {uploadError && (
                      <span className="text-[9px] text-rose-400 font-mono self-start">{uploadError}</span>
                    )}

                    <div className="w-full flex gap-2 mt-1">
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditName(user?.displayName || '');
                          setEditPhotoUrl(user?.photoURL || '');
                          setUploadError(null);
                        }}
                        disabled={isSaving}
                        className={`flex-1 py-1.5 rounded-lg border font-mono text-[9px] tracking-wider transition-all duration-300 cursor-pointer text-center
                          ${themeConfig.name === 'dark' ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-900/10 text-slate-700'}
                        `}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex-1 py-1.5 rounded-lg bg-cyan-600/30 border border-cyan-500/20 text-cyan-400 font-mono text-[9px] tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1 hover:bg-cyan-600/40"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* DISPLAY MODE */
                  <div className="w-full flex flex-col items-center text-center gap-3">
                    {/* Edit Profile floating button */}
                    <button
                      onClick={() => setIsEditing(true)}
                      className={`absolute right-3.5 top-3.5 p-1 rounded-lg border hover:bg-white/[0.04] transition-all cursor-pointer ${themeConfig.borderClass} ${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass}`}
                      title="Edit Profile"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <div className={`w-14 h-14 rounded-full border flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative
                      ${themeConfig.name === 'dark' ? 'border-white/10' : 'border-slate-900/10'}
                    `}>
                      {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'Profile'}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <User className={`w-7 h-7 ${themeConfig.textDarkClass}`} />
                      )}
                    </div>

                    <div>
                      <h3 className={`text-sm font-bold uppercase tracking-wide ${themeConfig.textBrightClass}`}>
                        {user?.displayName || 'Sylphy User'}
                      </h3>
                      <span className={`text-[9px] font-mono select-text leading-relaxed ${themeConfig.textMutedClass}`}>
                        {user?.email || 'authenticated_session'}
                      </span>
                    </div>

                    <div>
                      <span className={`px-2 py-0.5 rounded-full font-mono text-[7px] font-bold border uppercase
                        ${user?.providerData?.[0]?.providerId === 'facebook.com'
                          ? 'bg-[#1877F2]/10 border-[#1877F2]/20 text-[#1877F2]'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }
                      `}>
                        {user?.providerData?.[0]?.providerId === 'facebook.com' ? 'Facebook Auth' : 'Google Auth'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Interface Palette Section */}
              <div className="flex flex-col gap-2.5">
                <h3 className={`text-[10px] uppercase tracking-[0.15em] font-mono flex items-center gap-1.5 ${themeConfig.textDarkClass}`}>
                  Interface Palette
                </h3>
                <div className={`grid grid-cols-4 gap-1.5 p-1 border rounded-full select-none
                  ${themeConfig.name === 'dark' ? 'bg-matte-black/40 border-white/5' : 'bg-slate-900/5 border-slate-900/10'}
                `}>
                  {(['dark', 'light', 'pink', 'blue'] as ThemeName[]).map((t) => {
                    const isActive = theme === t;
                    let label = 'DARK';
                    let activeBtnClass = 'bg-[#15151a] text-cyber-cyan border border-white/15 shadow-[0_4px_12px_rgba(0,229,255,0.2)]';
                    
                    if (t === 'light') {
                      label = 'LIGHT';
                      activeBtnClass = 'bg-white text-indigo-600 border border-slate-900/10 shadow-[0_4px_12px_rgba(79,70,229,0.15)]';
                    } else if (t === 'pink') {
                      label = 'PINK';
                      activeBtnClass = 'bg-[#ffe4e6] text-pink-600 border border-pink-500/20 shadow-[0_4px_12px_rgba(219,39,119,0.15)]';
                    } else if (t === 'blue') {
                      label = 'AERO';
                      activeBtnClass = 'bg-[#e0f2fe] text-sky-600 border border-sky-500/20 shadow-[0_4px_12px_rgba(2,132,199,0.15)]';
                    }

                    return (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`py-1.5 text-[8px] font-mono tracking-wider rounded-full cursor-pointer transition-all duration-300
                          ${isActive
                            ? `${activeBtnClass} font-bold`
                            : `${themeConfig.textDarkClass} hover:${themeConfig.textMutedClass} hover:bg-white/[0.04]`
                          }
                        `}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notification Preferences Card */}
              <div className="flex flex-col gap-2.5">
                <h3 className={`text-[10px] uppercase tracking-[0.15em] font-mono flex items-center gap-1.5 ${themeConfig.textDarkClass}`}>
                  <Bell className="w-3 h-3" /> System Notifications
                </h3>
                
                <div className={`p-4 border rounded-[22px] flex flex-col gap-4 backdrop-blur-md
                  ${themeConfig.name === 'dark' ? 'border-white/5 bg-matte-black/10' : 'border-slate-900/5 bg-slate-900/[0.01]'}
                `}>
                  {/* Push Alerts Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-[11.5px] font-bold ${themeConfig.textBrightClass}`}>Push Notifications</span>
                      <span className={`text-[9.5px] ${themeConfig.textDarkClass}`}>Notify classes & deadlines</span>
                    </div>
                    {notificationPermission === 'denied' ? (
                      <span className="font-mono text-[8px] text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full select-none font-bold">
                        BLOCKED BY BROWSER
                      </span>
                    ) : (
                      <LiquidGlassSwitch
                        checked={notificationsEnabled}
                        onChange={onToggleNotifications}
                      />
                    )}
                  </div>

                  {/* Synthesized Sound effects */}
                  <div className="flex items-center justify-between border-t pt-3.5 border-white/5">
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-[11.5px] font-bold ${themeConfig.textBrightClass}`}>Audio Sound Effects</span>
                      <span className={`text-[9.5px] ${themeConfig.textDarkClass}`}>Play tone alarms on alerts</span>
                    </div>
                    <LiquidGlassSwitch
                      checked={soundEnabled}
                      onChange={() => {
                        const next = !soundEnabled;
                        setSoundEnabled(next);
                        localStorage.setItem('sylphy_sound_enabled', String(next));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Granular Alarm Threshold Config */}
              <div className="flex flex-col gap-2.5">
                <h3 className={`text-[10px] uppercase tracking-[0.15em] font-mono flex items-center gap-1.5 ${themeConfig.textDarkClass}`}>
                  <Clock className="w-3 h-3" /> Note Deadline Alarms
                </h3>
                
                <div className={`p-4 border rounded-[22px] flex flex-col gap-3 backdrop-blur-md
                  ${themeConfig.name === 'dark' ? 'border-white/5 bg-matte-black/10' : 'border-slate-900/5 bg-slate-900/[0.01]'}
                `}>
                  <p className={`text-[9.5px] leading-relaxed mb-1.5 ${themeConfig.textDarkClass}`}>
                    Trigger alerts before a note's deadline (checked items will not notify):
                  </p>

                  <div className="flex flex-col gap-3">
                    {([
                      { key: '1d', label: '1 Day Before' },
                      { key: '12h', label: '12 Hours Before' },
                      { key: '6h', label: '6 Hours Before' },
                      { key: '1h', label: '1 Hour Before' }
                    ] as const).map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className={`text-[11.5px] font-bold ${themeConfig.textBrightClass}`}>{label}</span>
                        <LiquidGlassSwitch
                          checked={deadlineSettings[key]}
                          onChange={() => handleDeadlineToggle(key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Maintenance & Reset */}
              <div className="flex flex-col gap-2.5">
                <h3 className={`text-[10px] uppercase tracking-[0.15em] font-mono flex items-center gap-1.5 ${themeConfig.textDarkClass}`}>
                  <AlertTriangle className="w-3 h-3" /> Maintenance
                </h3>
                <button
                  onClick={handleClearCache}
                  className="w-full py-2.5 rounded-xl border border-white/5 hover:border-amber-500/30 bg-white/[0.01] hover:bg-amber-500/5 text-amber-500 hover:text-amber-400 font-mono text-[9.5px] tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESET LOCAL BROWSER CACHE</span>
                </button>
              </div>

            </div>

            {/* Logout Action Footer */}
            <div className={`mt-5 border-t pt-4 flex flex-col gap-2 shrink-0 ${themeConfig.borderClass}`}>
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full py-3 rounded-full border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 hover:text-rose-400 font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>LOGOUT SESSION</span>
              </button>
              <span className={`text-[8px] font-mono text-center opacity-30 ${themeConfig.textDarkClass}`}>
                SylphySched Security Layer v1.3
              </span>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
