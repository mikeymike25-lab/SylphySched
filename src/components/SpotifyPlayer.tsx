import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Heart, Music, AlertCircle } from 'lucide-react';
import type { ThemeConfig } from '../types';

interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  albumArtUrl: string;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  shuffle: boolean;
  isLiked: boolean;
}

const SpotifyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-1.02-.336.073-.668-.138-.74-.474-.072-.335.138-.668.473-.74 3.85-.88 7.147-.5 9.813 1.135.295.18.387.563.207.862zm1.224-2.723c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.076-1.185-.412.125-.845-.107-.97-.52-.124-.412.108-.846.52-.97 3.66-1.11 8.23-.574 11.34 1.34.367.227.488.708.26 1.075zm.107-2.834C14.437 8.787 8.685 8.6 5.348 9.616c-.512.155-1.045-.134-1.2-.647-.156-.512.133-1.044.646-1.2 3.847-1.17 10.2-1.01 14.21 1.375.46.273.61.87.338 1.33-.273.46-.87.61-1.33.338z"/>
  </svg>
);

interface SpotifyPlayerProps {
  token: string | null;
  onConnect: (token: string) => void;
  onDisconnect: () => void;
  themeConfig: ThemeConfig;
}

// Mock database of tracks for Demo Mode
const DEMO_PLAYLIST: Omit<SpotifyTrack, 'isPlaying' | 'progressMs' | 'shuffle' | 'isLiked'>[] = [
  {
    id: 'demo1',
    title: 'Control It Your Way',
    artist: 'Sylphy ft. Spotify',
    albumArtUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=150&q=80',
    durationMs: 184000,
  },
  {
    id: 'demo2',
    title: 'Midnight Focus Beats',
    artist: 'Lo-Fi Sylphy',
    albumArtUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=150&q=80',
    durationMs: 145000,
  },
  {
    id: 'demo3',
    title: 'Sunny Afternoon Vibes',
    artist: 'Vibe Booster',
    albumArtUrl: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=150&q=80',
    durationMs: 210000,
  }
];

export const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({
  token,
  onConnect,
  onDisconnect,
  themeConfig,
}) => {
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [seekValue, setSeekValue] = useState<number>(0);
  
  // Demo Mode State
  const [demoIndex, setDemoIndex] = useState<number>(0);
  const [demoIsPlaying, setDemoIsPlaying] = useState<boolean>(false);
  const [demoProgress, setDemoProgress] = useState<number>(12000);
  const [demoShuffle, setDemoShuffle] = useState<boolean>(false);
  const [demoLiked, setDemoLiked] = useState<boolean>(false);

  const isDemo = token === 'demo_token';
  const progressTimerRef = useRef<any>(null);

  // Connect Helper using Authorization Code Flow with PKCE
  const handleConnectSpotify = async () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    
    // If no client ID is set, automatically fall back to Demo Mode so the UI works
    if (!clientId || clientId === 'paste_your_spotify_client_id_here') {
      console.log('No Spotify Client ID found. Activating simulated Demo Mode.');
      onConnect('demo_token');
      return;
    }

    // Helper to generate PKCE Code Verifier
    const generateCodeVerifier = (length: number) => {
      let text = '';
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return text;
    };

    // Helper to generate PKCE Code Challenge
    const generateCodeChallenge = async (codeVerifier: string) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      const byteArray = new Uint8Array(digest);
      let binary = '';
      for (let i = 0; i < byteArray.byteLength; i++) {
        binary += String.fromCharCode(byteArray[i]);
      }
      return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    };

    const verifier = generateCodeVerifier(64);
    localStorage.setItem('spotify_code_verifier', verifier);

    const challenge = await generateCodeChallenge(verifier);

    // Convert localhost to 127.0.0.1 due to Spotify's updated policies
    let origin = window.location.origin;
    if (origin.includes('localhost')) {
      origin = origin.replace('localhost', '127.0.0.1');
    }
    const redirectUri = origin + '/';
    
    const scopes = [
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'user-library-read',
      'user-library-modify'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state: verifier, // Pass verifier directly inside the state query param to solve cross-origin LocalStorage sandboxing!
      scope: scopes,
      show_dialog: 'true'
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

  // 1. DEMO MODE TICKING CONTROLLER
  useEffect(() => {
    if (!isDemo) return;

    // Load active demo track
    const base = DEMO_PLAYLIST[demoIndex];
    setTrack({
      id: base.id,
      title: base.title,
      artist: base.artist,
      albumArtUrl: base.albumArtUrl,
      durationMs: base.durationMs,
      isPlaying: demoIsPlaying,
      progressMs: demoProgress,
      shuffle: demoShuffle,
      isLiked: demoLiked,
    });
    setErrorMsg(null);
    setIsInitialLoading(false);
  }, [isDemo, demoIndex, demoIsPlaying, demoProgress, demoShuffle, demoLiked]);

  // Demo progress ticker
  useEffect(() => {
    if (!isDemo || !demoIsPlaying) return;

    const interval = setInterval(() => {
      setDemoProgress((prev) => {
        const base = DEMO_PLAYLIST[demoIndex];
        if (prev >= base.durationMs) {
          // Track ended, go to next
          setDemoIndex((prevIdx) => (prevIdx + 1) % DEMO_PLAYLIST.length);
          return 0;
        }
        return prev + 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isDemo, demoIsPlaying, demoIndex]);

  // 2. MOUNT & TRACKING REF
  const isMountedRef = useRef<boolean>(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 3. LIVE SPOTIFY API FETCH CONTROLLER (COMPONENT SCOPE)
  const fetchPlaybackState = useCallback(async () => {
    if (!token || isDemo || isDragging) return;
    console.log('SpotifyPlayer: Starting fetchPlaybackState polling cycle...');
    try {
      console.log('SpotifyPlayer: Fetching player state...');
      let res = await fetch('https://api.spotify.com/v1/me/player', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('SpotifyPlayer: Player state fetch returned status:', res.status);

      if (!isMountedRef.current) {
        console.log('SpotifyPlayer: Component unmounted, ignoring.');
        return;
      }

      // Session Expired
      if (res.status === 401) {
        console.warn('SpotifyPlayer: Token unauthorized (401). Disconnecting session.');
        onDisconnect();
        return;
      }

      let data = null;
      let shuffleState = false;

      if (res.ok && res.status !== 204) {
        console.log('SpotifyPlayer: Main response OK (200), parsing player data.');
        data = await res.json();
        shuffleState = data.shuffle_state || false;
      } else {
        console.log('SpotifyPlayer: Main response is 204 (No Content) or error.');
      }

      // Fallback: If player endpoint returned 204 or did not return active item, try currently-playing!
      if (!data || !data.item) {
        console.log('SpotifyPlayer: Fallback check - Querying currently-playing endpoint...');
        const fallbackRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!isMountedRef.current) {
          console.log('SpotifyPlayer: Fallback returned, but component unmounted. Ignoring.');
          return;
        }

        console.log('SpotifyPlayer: Fallback response status:', fallbackRes.status);

        if (fallbackRes.ok && fallbackRes.status !== 204) {
          data = await fallbackRes.json();
          console.log('SpotifyPlayer: Fallback parsed track data successfully.');
        }
      }

      if (!data || !data.item) {
        console.log('SpotifyPlayer: No track active in either endpoint. Setting track to null.');
        setTrack(null);
        setIsInitialLoading(false);
        return;
      }

      console.log('SpotifyPlayer: Active track detected:', data.item.name);

      // Check if track is liked in library
      let isLiked = false;
      if (sessionStorage.getItem('spotify_skip_library_check') !== 'true') {
        try {
          const likedRes = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${data.item.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (likedRes.ok) {
            const likedData = await likedRes.json();
            isLiked = likedData[0] || false;
          } else if (likedRes.status === 403) {
            console.warn('SpotifyPlayer: 403 Forbidden on library check. Disabling further checks to prevent console spam.');
            sessionStorage.setItem('spotify_skip_library_check', 'true');
          } else {
            console.warn('SpotifyPlayer: Could not read like status, setting to false. Status:', likedRes.status);
          }
        } catch (e) {
          console.warn('Could not read Spotify library status:', e);
        }
      }

      let albumArtUrl = '/placeholder-album.png'; // fallback
      if (data.item.album && data.item.album.images && data.item.album.images.length > 0) {
        albumArtUrl = data.item.album.images[0].url;
      }
      
      console.log('SpotifyPlayer: Parsed Album Art URL:', albumArtUrl);

      if (isMountedRef.current) {
        setErrorMsg(null);
        setTrack({
          id: data.item.id,
          title: data.item.name,
          artist: data.item.artists.map((a: any) => a.name).join(', '),
          albumArtUrl: albumArtUrl,
          isPlaying: data.is_playing,
          progressMs: data.progress_ms || 0,
          durationMs: data.item.duration_ms || 0,
          shuffle: shuffleState,
          isLiked,
        });
        setIsInitialLoading(false);
        console.log('SpotifyPlayer: Track state successfully set. Initial loading complete.');
      }
    } catch (err) {
      console.error('SpotifyPlayer: Exception caught in polling cycle:', err);
      if (isMountedRef.current) {
        setTrack(null);
        setIsInitialLoading(false);
      }
    }
  }, [token, isDemo, onDisconnect]);

  // 4. LIVE SPOTIFY API POLLING CONTROLLER
  useEffect(() => {
    if (!token || isDemo) return;

    fetchPlaybackState();
    const interval = setInterval(fetchPlaybackState, 4000);

    return () => {
      clearInterval(interval);
    };
  }, [token, isDemo, fetchPlaybackState]);

  // Smooth local progress bar ticking between API calls
  useEffect(() => {
    if (!track || !track.isPlaying || isDemo || isDragging) return;

    progressTimerRef.current = setInterval(() => {
      setTrack((prev) => {
        if (!prev) return null;
        if (prev.progressMs >= prev.durationMs) return prev;
        return {
          ...prev,
          progressMs: prev.progressMs + 1000,
        };
      });
    }, 1000);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [track?.id, track?.isPlaying, isDemo]);

  // 5. API OPERATION HANDLERS
  const sendPlayerCommand = async (endpoint: string, method: string, queryParam = '') => {
    if (isDemo) return true;
    if (!token) return false;

    try {
      setIsLoading(true);
      // We pass an empty body '' for POST/PUT requests to satisfy Content-Length requirements on some browsers
      const res = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}${queryParam}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: (method === 'POST' || method === 'PUT') ? '' : undefined,
      });

      if (res.status === 403) {
        setErrorMsg('Spotify Premium required to control playback.');
        setTimeout(() => setErrorMsg(null), 5000);
        return false;
      }

      if (res.status === 404) {
        setErrorMsg('No active Spotify player found. Start music on your device first.');
        setTimeout(() => setErrorMsg(null), 5000);
        return false;
      }

      return res.ok;
    } catch (err) {
      console.error('Player command failed:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (!track) return;
    const nextState = !track.isPlaying;

    if (isDemo) {
      setDemoIsPlaying(nextState);
      return;
    }

    // Optimistic Update
    setTrack(prev => prev ? { ...prev, isPlaying: nextState } : null);

    const success = await sendPlayerCommand(nextState ? 'play' : 'pause', 'PUT');
    if (!success) {
      // Revert on fail
      setTrack(prev => prev ? { ...prev, isPlaying: !nextState } : null);
    } else {
      // Instantly trigger playback state refresh to make controller feel real-time
      setTimeout(fetchPlaybackState, 600);
    }
  };

  const handleNext = async () => {
    if (isDemo) {
      setDemoIndex((prev) => (prev + 1) % DEMO_PLAYLIST.length);
      setDemoProgress(0);
      return;
    }

    await sendPlayerCommand('next', 'POST');
    // Instantly trigger playback state refresh to make controller feel real-time
    setTimeout(fetchPlaybackState, 600);
  };

  const handlePrev = async () => {
    if (isDemo) {
      setDemoIndex((prev) => (prev - 1 + DEMO_PLAYLIST.length) % DEMO_PLAYLIST.length);
      setDemoProgress(0);
      return;
    }

    await sendPlayerCommand('previous', 'POST');
    // Instantly trigger playback state refresh to make controller feel real-time
    setTimeout(fetchPlaybackState, 600);
  };

  const handleShuffle = async () => {
    if (!track) return;
    const nextShuffle = !track.shuffle;

    if (isDemo) {
      setDemoShuffle(nextShuffle);
      return;
    }

    // Optimistic Update
    setTrack(prev => prev ? { ...prev, shuffle: nextShuffle } : null);

    const success = await sendPlayerCommand('shuffle', 'PUT', `?state=${nextShuffle}`);
    if (!success) {
      setTrack(prev => prev ? { ...prev, shuffle: !nextShuffle } : null);
    } else {
      // Instantly trigger playback state refresh to make controller feel real-time
      setTimeout(fetchPlaybackState, 600);
    }
  };

  const handleLikeToggle = async () => {
    if (!track || !token) return;
    const nextLiked = !track.isLiked;

    if (isDemo) {
      setDemoLiked(nextLiked);
      return;
    }

    // Optimistic Update
    setTrack(prev => prev ? { ...prev, isLiked: nextLiked } : null);

    try {
      const res = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${track.id}`, {
        method: nextLiked ? 'PUT' : 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        // Revert on fail
        setTrack(prev => prev ? { ...prev, isLiked: !nextLiked } : null);
      }
    } catch (e) {
      console.error('Like toggle failed:', e);
      setTrack(prev => prev ? { ...prev, isLiked: !nextLiked } : null);
    }
  };

  // Helper formatting mm:ss
  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };


  return (
    <div className={`border p-4 rounded-[26px] backdrop-blur-2xl transition-all duration-500 flex flex-col gap-3.5 relative overflow-hidden select-none
      ${themeConfig.name === 'dark' ? 'border-white/5 bg-[#0f0f11]/30' : 'border-slate-900/5 bg-slate-900/[0.01]'}
    `}>
      {/* Background soft album art bleed effect */}
      {track && (
        <div 
          className="absolute inset-0 opacity-[0.04] blur-2xl scale-125 pointer-events-none transition-all duration-1000"
          style={{
            backgroundImage: `url(${track.albumArtUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Title Header */}
      <div className="flex items-center justify-between z-10">
        <span className={`font-mono text-[9px] font-bold tracking-widest uppercase ${themeConfig.textDarkClass}`}>
          {isDemo ? 'Spotify Simulation' : 'Spotify Connected'}
        </span>
        {token && (
          <button
            onClick={onDisconnect}
            className="text-[8px] font-mono hover:text-rose-400 opacity-60 hover:opacity-100 transition-all cursor-pointer uppercase"
          >
            Disconnect
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!token ? (
          /* 1. DISCONNECTED VIEW */
          <motion.div
            key="connect"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center py-6 text-center gap-3.5 z-10"
          >
            <div className="w-11 h-11 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/25 flex items-center justify-center text-[#1DB954] shadow-[0_0_15px_rgba(29,185,84,0.15)] animate-pulse">
              <SpotifyIcon className="w-5 h-5" />
            </div>

            <div>
              <h4 className={`text-xs font-bold uppercase tracking-wider ${themeConfig.textBrightClass}`}>
                Synchronize Spotify
              </h4>
              <p className={`text-[9.5px] mt-1 leading-relaxed max-w-[200px] mx-auto ${themeConfig.textDarkClass}`}>
                Link your active Spotify session to control study playlists directly.
              </p>
            </div>

            <button
              onClick={handleConnectSpotify}
              className="px-5 py-2.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black text-[10px] font-mono font-bold tracking-wider transition-all duration-300 transform active:scale-95 shadow-[0_4px_15px_rgba(29,185,84,0.3)] hover:shadow-[0_4px_22px_rgba(29,185,84,0.4)] flex items-center gap-2 cursor-pointer"
            >
              <SpotifyIcon className="w-3.5 h-3.5" />
              <span>CONNECT PLAYER</span>
            </button>
          </motion.div>
        ) : isInitialLoading ? (
          /* 2. LOADING STATE VIEW */
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-8 text-center gap-3 z-10"
          >
            <div className="w-6 h-6 rounded-full border-[2.5px] border-white/10 border-t-white/80 animate-spin" />
            <span className={`text-[8.5px] font-mono tracking-widest uppercase ${themeConfig.textDarkClass}`}>
              linking playback...
            </span>
          </motion.div>
        ) : !track ? (
          /* 3. NO ACTIVE SESSION VIEW */
          <motion.div
            key="no-playback"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center py-6 text-center gap-3 z-10"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 animate-bounce">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`text-xs font-bold uppercase tracking-wider ${themeConfig.textBrightClass}`}>
                No Active Spotify Device
              </h4>
              <p className={`text-[9.5px] mt-1 leading-relaxed max-w-[200px] mx-auto ${themeConfig.textDarkClass}`}>
                Open Spotify on your phone, tablet, or desktop and play a track to establish link.
              </p>
            </div>
          </motion.div>
        ) : (
          /* 4. ACTIVE PLAYER CONTROL VIEW */
          <motion.div
            key="player"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col gap-4 z-10"
          >
            {/* Display Art, Title, Artist */}
            {track && (
              <div className="flex items-center gap-4">
                {/* Album Art container with shadow & border */}
                <div className="w-16 h-16 rounded-[16px] overflow-hidden border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.4)] shrink-0 bg-matte-black/40 relative">
                  {track.albumArtUrl ? (
                    <img
                      src={track.albumArtUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <Music className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Track titles */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5 justify-center">
                  <span className={`text-[10px] font-mono font-bold uppercase opacity-45 tracking-wider ${themeConfig.accentTextClass}`}>
                    Now Playing
                  </span>
                  
                  {/* Scrolling track name if it overflows */}
                  <h4 className={`text-sm font-extrabold truncate uppercase ${themeConfig.textBrightClass}`} title={track.title}>
                    {track.title}
                  </h4>
                  
                  <p className={`text-[10.5px] font-semibold truncate ${themeConfig.textMutedClass}`} title={track.artist}>
                    {track.artist}
                  </p>
                </div>
              </div>
            )}

            {/* Error alerts */}
            {errorMsg && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-[8.5px] font-mono leading-relaxed">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Progress Slider (Interactive range input) */}
            {track && (() => {
              const currentProgress = isDragging ? seekValue : track.progressMs;
              const duration = track.durationMs || 1;
              const fillPercent = Math.min(100, (currentProgress / duration) * 100);

              return (
                <div className="flex flex-col gap-1.5 relative">
                  <style>{`
                    .spotify-slider::-webkit-slider-thumb {
                      -webkit-appearance: none;
                      appearance: none;
                      width: 8px;
                      height: 8px;
                      border-radius: 50%;
                      background: white;
                      cursor: pointer;
                      opacity: 0;
                      transition: opacity 0.2s ease;
                      box-shadow: 0 0 4px rgba(0,0,0,0.5);
                    }
                    .spotify-slider:hover::-webkit-slider-thumb {
                      opacity: 1;
                    }
                    .spotify-slider::-moz-range-thumb {
                      width: 8px;
                      height: 8px;
                      border: 0;
                      border-radius: 50%;
                      background: white;
                      cursor: pointer;
                      opacity: 0;
                      transition: opacity 0.2s ease;
                      box-shadow: 0 0 4px rgba(0,0,0,0.5);
                    }
                    .spotify-slider:hover::-moz-range-thumb {
                      opacity: 1;
                    }
                  `}</style>
                  <input
                    type="range"
                    min="0"
                    max={track.durationMs}
                    value={currentProgress}
                    onMouseDown={() => {
                      setIsDragging(true);
                      setSeekValue(track.progressMs);
                    }}
                    onTouchStart={() => {
                      setIsDragging(true);
                      setSeekValue(track.progressMs);
                    }}
                    onChange={(e) => {
                      setSeekValue(Number(e.target.value));
                    }}
                    onMouseUp={async () => {
                      setIsDragging(false);
                      setTrack(prev => prev ? { ...prev, progressMs: seekValue } : null);
                      if (isDemo) {
                        setDemoProgress(seekValue);
                        return;
                      }
                      const success = await sendPlayerCommand('seek', 'PUT', `?position_ms=${seekValue}`);
                      if (success) {
                        setTimeout(fetchPlaybackState, 600);
                      }
                    }}
                    onTouchEnd={async () => {
                      setIsDragging(false);
                      setTrack(prev => prev ? { ...prev, progressMs: seekValue } : null);
                      if (isDemo) {
                        setDemoProgress(seekValue);
                        return;
                      }
                      const success = await sendPlayerCommand('seek', 'PUT', `?position_ms=${seekValue}`);
                      if (success) {
                        setTimeout(fetchPlaybackState, 600);
                      }
                    }}
                    className="spotify-slider w-full h-[3px] rounded-full appearance-none cursor-pointer outline-none transition-all duration-150"
                    style={{
                      background: `linear-gradient(to right, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.8) ${fillPercent}%, rgba(255,255,255,0.15) ${fillPercent}%, rgba(255,255,255,0.15) 100%)`
                    }}
                  />
                  <div className="flex items-center justify-between text-[9px] font-mono opacity-50 font-bold">
                    <span>{formatTime(currentProgress)}</span>
                    <span>{formatTime(track.durationMs)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Spotify Player Control Buttons */}
            {track && (
              <div className="flex items-center justify-between px-1">
                {/* Shuffle Button */}
                <button
                  onClick={handleShuffle}
                  className={`p-1.5 rounded-full hover:bg-white/5 transition-all cursor-pointer
                    ${track.shuffle ? 'text-[#1DB954] drop-shadow-[0_0_6px_rgba(29,185,84,0.4)]' : 'text-white/60 hover:text-white'}
                  `}
                  title="Shuffle"
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                {/* Backwards Button */}
                <button
                  onClick={handlePrev}
                  className="p-1.5 rounded-full hover:bg-white/5 text-white/80 hover:text-white transition-all cursor-pointer transform active:scale-90"
                  title="Previous"
                >
                  <SkipBack className="w-4 h-4 fill-white/10" />
                </button>

                {/* Play/Pause Button (Main central button) */}
                <button
                  onClick={handlePlayPause}
                  disabled={isLoading}
                  className={`w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_4px_10px_rgba(255,255,255,0.2)] cursor-pointer
                    ${isLoading && 'opacity-50'}
                  `}
                  title={track.isPlaying ? 'Pause' : 'Play'}
                >
                  {track.isPlaying ? (
                    <Pause className="w-4.5 h-4.5 fill-black stroke-black" />
                  ) : (
                    <Play className="w-4.5 h-4.5 fill-black stroke-black translate-x-[1px]" />
                  )}
                </button>

                {/* Skipwards Button */}
                <button
                  onClick={handleNext}
                  className="p-1.5 rounded-full hover:bg-white/5 text-white/80 hover:text-white transition-all cursor-pointer transform active:scale-90"
                  title="Next"
                >
                  <SkipForward className="w-4 h-4 fill-white/10" />
                </button>

                {/* Heart/Like Button */}
                <button
                  onClick={handleLikeToggle}
                  className={`p-1.5 rounded-full hover:bg-white/5 transition-all cursor-pointer
                    ${track.isLiked ? 'text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)] fill-rose-500' : 'text-white/60 hover:text-white'}
                  `}
                  title={track.isLiked ? 'Remove from Liked Songs' : 'Like'}
                >
                  <Heart className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
