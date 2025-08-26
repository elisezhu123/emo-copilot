import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import StatusBar from '../components/StatusBar';
import { simpleMusicService } from '../services/simpleMusicService';
import { audioManager, AudioState } from '../services/audioManager';
import { Track, musicService } from '../services/musicService';
import MusicProgressBar from '../components/MusicProgressBar';

const MusicPlaylists = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const initialGenresRef = useRef<string[]>([]);
  const lastLocationRef = useRef<string>('');
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isMuted: false,
    isLoading: false,
    error: null
  });

  // Load tracks from the music service - defined here for proper scope access
  const loadTracks = async (isUpdate = false, forceRefresh = false) => {
    try {
      console.log('🔍 MusicPlaylists: Starting loadTracks function, isUpdate:', isUpdate);

      // Check if musicService is available
      if (!musicService || typeof musicService.loadSelectedGenres !== 'function') {
        console.error('musicService is not available');
        return;
      }

      const savedGenres = musicService.loadSelectedGenres();
      console.log('🔍 MusicPlaylists: Loaded genres from localStorage:', savedGenres);
      console.log('🔍 MusicPlaylists: Genres length:', savedGenres?.length || 0);

      // If we have genres, show loading state
      if (savedGenres && savedGenres.length > 0) {
        if (isUpdate) {
          setIsUpdating(true);
          console.log('🔍 MusicPlaylists: Setting updating state to true');
        } else {
          setIsLoadingTracks(true);
          console.log('🔍 MusicPlaylists: Setting loading state to true');
        }
      }

      // Store initial genres for comparison in handleFocus
      initialGenresRef.current = savedGenres || [];

      if (savedGenres && savedGenres.length > 0) {
        console.log('⚡ Fast loading music for genres:', savedGenres);

        // Check if already loading to prevent duplicate requests
        if (simpleMusicService.isCurrentlyLoading()) {
          console.log('⚡ Already loading, waiting...');
          return;
        }

        // If this is an update (genre change), force clear cache first
        if (isUpdate) {
          console.log('🧹 Force clearing cache for genre update');
          simpleMusicService.clearCache();
        }

        // Smart reload (uses cache when appropriate)
        await simpleMusicService.forceFreshReload(savedGenres, forceRefresh);

        const allTracks = await simpleMusicService.getAllTracks();
        console.log('⚡ Fast loaded:', allTracks.length, 'tracks');

        // Critical fallback: If simpleMusicService returns no tracks, use musicService fallback
        let finalTracks = allTracks;
        if (allTracks.length === 0) {
          console.log('🔄 No tracks from simpleMusicService, falling back to musicService tracks');
          finalTracks = musicService.getFilteredTracks();
          console.log('🔄 Fallback tracks found:', finalTracks.length);
        }

        setTracks(finalTracks);

        if (finalTracks.length > 0) {
          // Only set new current track if we don't have one, or if this is not an update
          if (!currentTrack || !isUpdate) {
            setCurrentTrack(finalTracks[0]);
          }
          audioManager.setPlaylist(finalTracks);
        }

        // Update the ref with successfully loaded genres for future focus comparisons
        initialGenresRef.current = savedGenres;
        setHasInitiallyLoaded(true);
      } else {
        console.log('🔍 MusicPlaylists: No genres selected or empty array');
        console.log('🔍 MusicPlaylists: savedGenres value:', savedGenres);
        console.log('🔍 MusicPlaylists: savedGenres type:', typeof savedGenres);
        setTracks([]);
        setCurrentTrack(null);
        // Reset the ref when no genres are selected
        initialGenresRef.current = [];
        setHasInitiallyLoaded(false);
      }
    } catch (error) {
      console.error('🔍 MusicPlaylists: Error loading tracks:', error);
      console.error('🔍 MusicPlaylists: Error stack:', error.stack);
      setTracks([]);
      setCurrentTrack(null);
    } finally {
      console.log('🔍 MusicPlaylists: Setting loading states to false');
      // Add a small delay to ensure user sees the loading state
      setTimeout(() => {
        setIsLoadingTracks(false);
        setIsUpdating(false);
      }, isUpdate ? 800 : 500); // Longer delay for updates
    }
  };

  // Monitor location changes to detect when user returns from genre selection
  useEffect(() => {
    console.log('🔍 Location changed to:', location.pathname);

    // If this is a navigation TO the playlists page (not initial mount)
    if (lastLocationRef.current && lastLocationRef.current !== location.pathname) {
      console.log('🔍 Detected navigation to playlists page from:', lastLocationRef.current);

      // Check for genre changes when returning to playlists
      const currentGenres = musicService.loadSelectedGenres();
      const previousGenres = initialGenresRef.current;
      const genresChanged = JSON.stringify(currentGenres?.sort()) !== JSON.stringify(previousGenres?.sort());

      console.log('🔍 Navigation - Current genres:', currentGenres);
      console.log('🔍 Navigation - Previous genres:', previousGenres);
      console.log('🔍 Navigation - Genres changed?', genresChanged);

      if (genresChanged) {
        console.log('🔄 Navigation detected genre change - updating playlists');
        initialGenresRef.current = currentGenres || [];
        setIsUpdating(true);
        // Small delay to ensure UI shows updating state
        setTimeout(() => {
          loadTracks(true, false);
        }, 100);
      }
    }

    lastLocationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    // Immediately check if we have genres to show loading state
    const immediateGenreCheck = () => {
      const genres = musicService.loadSelectedGenres();
      console.log('🔍 Immediate genre check on mount:', genres);
      console.log('🔍 Genres array length:', genres?.length || 0);
      console.log('🔍 Current loading state:', isLoadingTracks);
      if (genres && genres.length > 0) {
        console.log('🔍 Genres detected, setting loading state to true');
        setIsLoadingTracks(true);
        console.log('🔍 Loading state should now be true');
      } else {
        console.log('🔍 No genres detected on mount');
      }
    };

    immediateGenreCheck();

    // Load tracks from the music service - same logic as dashboard
    const loadTracks = async (isUpdate = false, forceRefresh = false) => {
      console.log('🔍 MusicPlaylists: Starting loadTracks function, isUpdate:', isUpdate);

      const savedGenres = musicService.loadSelectedGenres();
      console.log('🔍 MusicPlaylists: Loaded genres from localStorage:', savedGenres);
      console.log('🔍 MusicPlaylists: Genres length:', savedGenres?.length || 0);

      // If we have genres, show loading state
      if (savedGenres && savedGenres.length > 0) {
        if (isUpdate) {
          setIsUpdating(true);
          console.log('🔍 MusicPlaylists: Setting updating state to true');
        } else {
          setIsLoadingTracks(true);
          console.log('🔍 MusicPlaylists: Setting loading state to true');
        }
      }

      try {
        // Check if musicService is available
        if (!musicService || typeof musicService.loadSelectedGenres !== 'function') {
          console.error('musicService is not available');
          return;
        }

        // Test API configuration immediately
        console.log('🎵 Testing API configuration...');
        console.log('🎵 Freesound API Key:', import.meta.env.VITE_FREESOUND_API_KEY ? 'CONFIGURED' : 'MISSING');
        console.log('🎵 DeepSeek API Key:', import.meta.env.VITE_DEEPSEEK_API_KEY ? 'CONFIGURED' : 'MISSING');

        // Store initial genres for comparison in handleFocus
        initialGenresRef.current = savedGenres || [];

        if (savedGenres && savedGenres.length > 0) {
          console.log('⚡ Fast loading music for genres:', savedGenres);

          // Check if already loading to prevent duplicate requests
          if (simpleMusicService.isCurrentlyLoading()) {
            console.log('⚡ Already loading, waiting...');
            return;
          }

          // If this is an update (genre change), force clear cache first
          if (isUpdate) {
            console.log('🧹 Force clearing cache for genre update');
            simpleMusicService.clearCache();
          }

          // Smart reload (uses cache when appropriate)
          await simpleMusicService.forceFreshReload(savedGenres, forceRefresh);

          const allTracks = await simpleMusicService.getAllTracks();
        console.log('⚡ Fast loaded:', allTracks.length, 'tracks');

        // Critical fallback: If simpleMusicService returns no tracks, use musicService fallback
        let finalTracks = allTracks;
        if (allTracks.length === 0) {
          console.log('🔄 No tracks from simpleMusicService, falling back to musicService tracks');
          finalTracks = musicService.getFilteredTracks();
          console.log('🔄 Fallback tracks found:', finalTracks.length);
        }

        setTracks(finalTracks);

        if (finalTracks.length > 0) {
          // Only set new current track if we don't have one, or if this is not an update
          if (!currentTrack || !isUpdate) {
            setCurrentTrack(finalTracks[0]);
          }
          audioManager.setPlaylist(finalTracks);
        }

          // Update the ref with successfully loaded genres for future focus comparisons
          initialGenresRef.current = savedGenres;
          setHasInitiallyLoaded(true);
        } else {
          console.log('🔍 MusicPlaylists: No genres selected or empty array');
          console.log('🔍 MusicPlaylists: savedGenres value:', savedGenres);
          console.log('🔍 MusicPlaylists: savedGenres type:', typeof savedGenres);
          setTracks([]);
          setCurrentTrack(null);
          // Reset the ref when no genres are selected
          initialGenresRef.current = [];
          setHasInitiallyLoaded(false);
        }
      } catch (error) {
        console.error('🔍 MusicPlaylists: Error loading tracks:', error);
        console.error('🔍 MusicPlaylists: Error stack:', error.stack);
        setTracks([]);
        setCurrentTrack(null);
      } finally {
        console.log('🔍 MusicPlaylists: Setting loading states to false');
        // Add a small delay to ensure user sees the loading state
        setTimeout(() => {
          setIsLoadingTracks(false);
          setIsUpdating(false);
        }, isUpdate ? 800 : 500); // Longer delay for updates
      }
    };

    loadTracks();

    // Also check for genre changes immediately when component mounts
    // This helps catch cases where user navigated back with new genres
    const checkGenresOnMount = () => {
      // Check multiple times with different delays to catch any timing issues
      [300, 800, 1500].forEach(delay => {
        setTimeout(() => {
          console.log(`🔍 Checking for genre changes ${delay}ms after mount`);
          const currentGenres = musicService.loadSelectedGenres();
          const mountGenres = initialGenresRef.current;
          const mountChanged = JSON.stringify(currentGenres?.sort()) !== JSON.stringify(mountGenres?.sort());

          console.log(`🔍 Mount check (${delay}ms) - Current:`, currentGenres);
          console.log(`🔍 Mount check (${delay}ms) - Previous:`, mountGenres);
          console.log(`🔍 Mount check (${delay}ms) - Changed:`, mountChanged);

          if (mountChanged && currentGenres && currentGenres.length > 0) {
            console.log('🔄 Detected genre change after mount, reloading');
            initialGenresRef.current = currentGenres;
            loadTracks(true, false); // Pass true to indicate this is an update
          }
        }, delay);
      });
    };

    checkGenresOnMount();

    // Subscribe to audio state changes
    const unsubscribe = audioManager.subscribe((state: AudioState) => {
      setAudioState(state);
      const audioTrack = audioManager.getCurrentTrack();
      if (audioTrack && audioTrack.id !== currentTrack?.id) {
        setCurrentTrack(audioTrack);
      }
    });

    // Listen for localStorage changes (real-time genre updates)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'selectedMusicGenres') {
        console.log('🔄 Real-time: localStorage changed, updating playlists automatically');
        setTimeout(() => {
          const newGenres = musicService.loadSelectedGenres();
          const currentGenres = initialGenresRef.current;
          const genresChanged = JSON.stringify(newGenres?.sort()) !== JSON.stringify(currentGenres?.sort());

          if (genresChanged) {
            console.log('🔄 Real-time: Genre change detected via localStorage event');
            console.log('🔄 Real-time: New genres:', newGenres);
            console.log('🔄 Real-time: Previous genres:', currentGenres);
            initialGenresRef.current = newGenres || [];
            setIsUpdating(true);
            loadTracks(true, false);
          }
        }, 200); // Small delay to ensure localStorage is fully updated
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Only refresh on focus if genres might have changed
    const handleFocus = () => {
      try {
        console.log('🔍 Focus event triggered on MusicPlaylists page');

        if (!musicService || typeof musicService.loadSelectedGenres !== 'function') {
          console.error('musicService not available in handleFocus');
          return;
        }

        const currentGenres = musicService.loadSelectedGenres();
        console.log('🔍 Current genres from localStorage:', currentGenres);
        console.log('🔍 Previous genres from ref:', initialGenresRef.current);

        const genresChanged = JSON.stringify(currentGenres?.sort()) !== JSON.stringify(initialGenresRef.current?.sort());
        console.log('🔍 Genres changed?', genresChanged);

        if (genresChanged) {
          console.log('🔄 Genres changed - refreshing playlist');
          // Update ref immediately to prevent duplicate loads
          initialGenresRef.current = currentGenres || [];
          loadTracks(true, false); // Pass true to indicate this is an update
        } else {
          console.log('⚡ Same genres - keeping current playlist for better UX');
        }
      } catch (error) {
        console.error('Error in handleFocus:', error);
      }
    };

    // Visibility change listener as backup for focus events
    const handleVisibilityChange = () => {
      try {
        if (!document.hidden) {
          console.log('🔍 Page became visible - checking for genre changes');

          // Add delay to ensure any localStorage updates have completed
          setTimeout(() => {
            try {
              if (!musicService || typeof musicService.loadSelectedGenres !== 'function') {
                console.error('musicService not available in handleVisibilityChange');
                return;
              }

              const currentGenres = musicService.loadSelectedGenres();
              const previousGenres = initialGenresRef.current;
              const genresChanged = JSON.stringify(currentGenres?.sort()) !== JSON.stringify(previousGenres?.sort());

              console.log('🔍 Visibility - Current genres:', currentGenres);
              console.log('🔍 Visibility - Previous genres:', previousGenres);
              console.log('🔍 Visibility - Genres changed?', genresChanged);

              if (genresChanged) {
                console.log('🔄 Visibility detected genre change - updating playlists');
                initialGenresRef.current = currentGenres || [];
                loadTracks(true, false);
              }
            } catch (error) {
              console.error('Error in visibility timeout:', error);
            }
          }, 200);
        }
      } catch (error) {
        console.error('Error in handleVisibilityChange:', error);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Enhanced periodic check for genre changes - more frequent for better responsiveness
    const genreCheckInterval = setInterval(() => {
      try {
        const currentGenres = musicService.loadSelectedGenres();
        const previousGenres = initialGenresRef.current;
        const genresChanged = JSON.stringify(currentGenres?.sort()) !== JSON.stringify(previousGenres?.sort());

        if (genresChanged) {
          console.log('🔄 Auto-update: Periodic check detected genre change');
          console.log('🔄 Auto-update: Current genres:', currentGenres);
          console.log('🔄 Auto-update: Previous genres:', previousGenres);
          initialGenresRef.current = currentGenres || [];
          setIsUpdating(true);
          // Use setTimeout to prevent blocking the interval
          setTimeout(() => {
            loadTracks(true, false);
          }, 50); // Faster response
        }
      } catch (error) {
        console.error('Error in periodic genre check:', error);
      }
    }, 1000); // Check every 1 second for more responsive auto-updates

    // Additional faster check when page is visible and focused
    const fastCheckInterval = setInterval(() => {
      if (!document.hidden && document.hasFocus()) {
        try {
          const currentGenres = musicService.loadSelectedGenres();
          const previousGenres = initialGenresRef.current;
          const genresChanged = JSON.stringify(currentGenres?.sort()) !== JSON.stringify(previousGenres?.sort());

          if (genresChanged) {
            console.log('🔄 Auto-update: Fast check detected genre change while page focused');
            initialGenresRef.current = currentGenres || [];
            setIsUpdating(true);
            loadTracks(true, false);
          }
        } catch (error) {
          console.error('Error in fast genre check:', error);
        }
      }
    }, 500); // Very fast check when page is active

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(genreCheckInterval);
    };
  }, []);

  const togglePlayPause = async () => {
    try {
      if (!audioState.isPlaying && currentTrack) {
        await audioManager.playTrack(currentTrack);
      } else {
        await audioManager.togglePlay();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const playPreviousTrack = async () => {
    try {
      await audioManager.playPreviousTrack();
    } catch (error) {
      console.error('Error playing previous track:', error);
    }
  };

  const playNextTrack = async () => {
    try {
      await audioManager.playNextTrack();
    } catch (error) {
      console.error('Error playing next track:', error);
    }
  };

  const toggleMute = () => {
    audioManager.toggleMute();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `-${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const openSpotify = () => {
    window.open('https://open.spotify.com/', '_blank');
  };

  const openAppleMusic = () => {
    window.open('https://music.apple.com/', '_blank');
  };

  const openYouTubeMusic = () => {
    window.open('https://music.youtube.com/', '_blank');
  };

  const playTrack = async (track: Track) => {
    try {
      if (!track) {
        console.error('No track provided to playTrack');
        return;
      }
      if (!track.url) {
        console.error('Track has no URL:', track);
        return;
      }

      console.log('🎵 Setting current track:', track.title);
      setCurrentTrack(track);

      console.log('🎵 Starting audio playback...');
      await audioManager.playTrack(track);

      console.log('🎵 Track playback started successfully');
    } catch (error) {
      console.error('Error playing track:', error);
      // Don't rethrow the error to prevent onClick handler from failing
    }
  };

  return (
    <div className="min-h-screen bg-white px-3 py-2 max-w-md mx-auto lg:max-w-4xl xl:max-w-6xl">
      {/* Status Bar */}
      <StatusBar
        title="Music Playlists"
        showBackButton={true}
        showDriverState={true}
        showTemperature={true}
      />

      {/* Main Music Player - Matching Dashboard Design */}
      <div className="bg-white border border-emotion-face rounded-xl p-2 mb-4 lg:p-4 cursor-move">
        <div className="flex items-center gap-2 mb-2 lg:gap-4 lg:mb-4">
          <div className="w-12 h-12 bg-emotion-orange rounded-lg lg:w-16 lg:h-16 flex items-center justify-center">
            <svg className="w-6 h-6 lg:w-8 lg:h-8" viewBox="0 0 24 24" fill="none">
              <path d="M12 3V20.5C12 21.3284 11.3284 22 10.5 22H9.5C8.67157 22 8 21.3284 8 20.5V11.5C8 10.6716 8.67157 10 9.5 10H10.5C11.3284 10 12 10.6716 12 11.5V20.5ZM12 3V20.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 7L18 5V18.5C18 19.3284 17.3284 20 16.5 20H15.5C14.6716 20 14 19.3284 14 18.5V9.5C14 8.67157 14.6716 8 15.5 8H16.5C17.3284 8 18 8.67157 18 9.5V18.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-base font-medium text-black lg:text-xl">
              {currentTrack ? currentTrack.title :
                (isLoadingTracks || isUpdating) ? 'Loading your music...' :
                'Select music genres first, then click play'}
            </h4>
            <p className="text-xs text-emotion-default lg:text-sm">
              {currentTrack ? (
                <>
                  {currentTrack.artist} • {currentTrack.genre}
                  {tracks.length > 1 && (
                    <span className="ml-2 text-emotion-orange">
                      ({tracks.findIndex(t => t.id === currentTrack.id) + 1}/{tracks.length})
                    </span>
                  )}
                </>
              ) : (
                (isLoadingTracks || isUpdating) ?
                  (isUpdating ? 'Updating your playlists...' : 'Loading tracks from your selected genres...') :
                  'Select music genres first to load tracks'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Previous Track Button */}
            <button
              className="p-1 lg:p-2 transition-all duration-200 hover:scale-105"
              onClick={playPreviousTrack}
              disabled={tracks.length <= 1}
              style={{
                opacity: tracks.length <= 1 ? 0.3 : 1
              }}
            >
              <svg className="w-4 h-4 lg:w-5 lg:h-5" viewBox="0 0 20 20" fill="none">
                <path d="M2 4C2 3.44772 2.44772 3 3 3C3.55228 3 4 3.44772 4 4V16C4 16.5523 3.55228 17 3 17C2.44772 17 2 16.5523 2 16V4ZM17.0455 3.84596C18.0616 3.26008 19.3333 4.01881 19.3333 5.21406V14.7859C19.3333 15.9812 18.0616 16.7399 17.0455 16.154L8.04549 11.3681C7.07924 10.8092 7.07924 9.19081 8.04549 8.63192L17.0455 3.84596Z" fill="#FF8B7E"/>
              </svg>
            </button>

            {/* Play/Pause Button */}
            <button
              className="p-1 lg:p-2 transition-all duration-200 hover:scale-105"
              onClick={togglePlayPause}
              disabled={audioState.isLoading}
              style={{
                opacity: audioState.isLoading ? 0.5 : 1,
                filter: audioState.isLoading ? 'blur(1px)' : 'none'
              }}
            >
              {audioState.isLoading ? (
                // Loading spinner
                <div className="w-5 h-5 lg:w-6 lg:h-6 border-2 border-emotion-orange border-t-transparent rounded-full animate-spin"></div>
              ) : audioState.isPlaying ? (
                // Pause icon
                <svg className="w-5 h-5 lg:w-6 lg:h-6" viewBox="0 0 20 21" fill="none">
                  <path d="M5 2.5C3.89543 2.5 3 3.39543 3 4.5V16.5C3 17.6046 3.89543 18.5 5 18.5H7C8.10457 18.5 9 17.6046 9 16.5V4.5C9 3.39543 8.10457 2.5 7 2.5H5ZM13 2.5C11.8954 2.5 11 3.39543 11 4.5V16.5C11 17.6046 11.8954 18.5 13 18.5H15C16.1046 18.5 17 17.6046 17 16.5V4.5C17 3.39543 16.1046 2.5 15 2.5H13Z" fill="#FF8B7E"/>
                </svg>
              ) : (
                // Play icon from Figma design
                <svg className="w-5 h-5 lg:w-6 lg:h-6" viewBox="0 0 20 21" fill="none">
                  <path d="M17.2221 9.18458C18.2586 9.75438 18.2586 11.2437 17.2221 11.8135L7.22259 17.3105C6.22292 17.86 5 17.1367 5 15.996L5 5.00214C5 3.86137 6.22292 3.13812 7.22259 3.68766L17.2221 9.18458Z" fill="#FF8B7E"/>
                </svg>
              )}
            </button>

            {/* Next Track Button */}
            <button
              className="p-1 lg:p-2 transition-all duration-200 hover:scale-105"
              onClick={playNextTrack}
              disabled={tracks.length <= 1}
              style={{
                opacity: tracks.length <= 1 ? 0.3 : 1
              }}
            >
              <svg className="w-4 h-4 lg:w-5 lg:h-5" viewBox="0 0 20 20" fill="none">
                <path d="M18 4C18 3.44772 17.5523 3 17 3C16.4477 3 16 3.44772 16 4V16C16 16.5523 16.4477 17 17 17C17.5523 17 18 16.5523 18 16V4ZM2.95451 3.84596C1.93841 3.26008 0.666672 4.01881 0.666672 5.21406V14.7859C0.666672 15.9812 1.93841 16.7399 2.95451 16.154L11.9545 11.3681C12.9208 10.8092 12.9208 9.19081 11.9545 8.63192L2.95451 3.84596Z" fill="#FF8B7E"/>
              </svg>
            </button>
          </div>

          <button className="p-1 lg:p-2" onClick={toggleMute}>
            {audioState.isMuted ? (
              // Muted volume icon from Figma design
              <svg className="w-6 h-6 lg:w-7 lg:h-7" viewBox="0 0 24 25" fill="none">
                <path d="M15 4.75C15 3.67138 13.7255 3.09915 12.9195 3.81583L8.42794 7.80909C8.29065 7.93116 8.11333 7.99859 7.92961 7.99859H4.25C3.00736 7.99859 2 9.00595 2 10.2486V14.7465C2 15.9891 3.00736 16.9965 4.25 16.9965H7.92956C8.11329 16.9965 8.29063 17.0639 8.42793 17.186L12.9194 21.1797C13.7255 21.8965 15 21.3243 15 20.2456V4.75ZM16.2197 9.71967C16.5126 9.42678 16.9874 9.42678 17.2803 9.71967L19 11.4393L20.7197 9.71967C21.0126 9.42678 21.4874 9.42678 21.7803 9.71967C22.0732 10.0126 22.0732 10.4874 21.7803 10.7803L20.0607 12.5L21.7803 14.2197C22.0732 14.5126 22.0732 14.9874 21.7803 15.2803C21.4874 15.5732 21.0126 15.5732 20.7197 15.2803L19 13.5607L17.2803 15.2803C16.9874 15.5732 16.5126 15.5732 16.2197 15.2803C15.9268 14.9874 15.9268 14.5126 16.2197 14.2197L17.9393 12.5L16.2197 10.7803C15.9268 10.4874 15.9268 10.0126 16.2197 9.71967Z" fill="#FFA680"/>
              </svg>
            ) : (
              // Normal volume icon
              <svg className="w-6 h-6 lg:w-7 lg:h-7" viewBox="0 0 24 25" fill="none">
                <path d="M15 4.75V20.2456C15 21.3243 13.7255 21.8965 12.9194 21.1797L8.42793 17.186C8.29063 17.0639 8.11329 16.9965 7.92956 16.9965H4.25C3.00736 16.9965 2 15.9891 2 14.7465V10.2486C2 9.00595 3.00736 7.99859 4.25 7.99859H7.92961C8.11333 7.99859 8.29065 7.93116 8.42794 7.80909L12.9195 3.81583C13.7255 3.09915 15 3.67138 15 4.75ZM18.9916 6.39733C19.3244 6.15079 19.7941 6.22077 20.0407 6.55362C21.2717 8.2157 22 10.2739 22 12.5C22 14.7261 21.2717 16.7843 20.0407 18.4464C19.7941 18.7793 19.3244 18.8492 18.9916 18.6027C18.6587 18.3562 18.5888 17.8865 18.8353 17.5536C19.8815 16.1411 20.5 14.3939 20.5 12.5C20.5 10.6062 19.8815 8.85896 18.8353 7.44641C18.5888 7.11356 18.6587 6.64387 18.9916 6.39733ZM17.143 8.86933C17.5072 8.67214 17.9624 8.80757 18.1596 9.17184C18.6958 10.1624 19 11.2968 19 12.5C19 13.7032 18.6958 14.8376 18.1596 15.8282C17.9624 16.1924 17.5072 16.3279 17.143 16.1307C16.7787 15.9335 16.6432 15.4783 16.8404 15.1141C17.2609 14.3373 17.5 13.4477 17.5 12.5C17.5 11.5523 17.2609 10.6627 16.8404 9.88593C16.6432 9.52167 16.7787 9.06652 17.143 8.86933Z" fill="#FFA680"/>
              </svg>
            )}
          </button>
        </div>

        {/* Music Progress Bar - Same as Dashboard */}
        <MusicProgressBar
          currentTime={audioState.currentTime}
          duration={audioState.duration || (currentTrack ? currentTrack.duration : 180)}
          onProgressChange={(progress) => {
            console.log('Progress changed:', progress);
            audioManager.seekToPercent(progress);
          }}
        />

        {/* Audio Source Status */}
        <div className="mt-2 text-center">
          {audioState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-2">
              <p className="text-xs text-red-600 mb-1">
                🔊 Audio Issue: {audioState.error}
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={async () => {
                    try {
                      if (currentTrack) {
                        console.log('🔄 Retrying current track:', currentTrack.title);
                        await playTrack(currentTrack);
                      } else {
                        console.log('🔄 No current track to retry');
                      }
                    } catch (error) {
                      console.error('Retry failed:', error);
                    }
                  }}
                  className="text-xs text-blue-700 underline hover:text-blue-800"
                >
                  🔄 Retry
                </button>
                <button
                  onClick={async () => {
                    try {
                      console.log('🎵 Trying next track...');
                      await playNextTrack();
                    } catch (error) {
                      console.error('Next track failed:', error);
                    }
                  }}
                  className="text-xs text-green-700 underline hover:text-green-800"
                  disabled={tracks.length <= 1}
                >
                  ⏭️ Next Track
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs text-red-700 underline hover:text-red-800"
                >
                  🔄 Refresh Page
                </button>
              </div>
            </div>
          )}
          {audioState.isLoading && (
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="w-3 h-3 border border-emotion-orange border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-emotion-default">
                ⚡ Loading audio...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Music Service Links - Horizontal Layout from Figma */}
      <div className="flex p-3 items-center gap-3 border border-emotion-face rounded-xl mb-4 sm:gap-4 lg:gap-4">
        {/* Spotify Button */}
        <button
          onClick={openSpotify}
          className="flex flex-1 h-8 px-2 py-1 justify-center items-center gap-2 rounded-lg border border-emotion-face bg-flowkit-green transition-all duration-200 hover:scale-105 sm:px-3 sm:py-1.5 lg:h-8"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M15.9 8.89999C12.7 6.99999 7.35 6.8 4.3 7.75C3.8 7.9 3.3 7.6 3.15 7.15C3 6.65 3.3 6.15 3.75 6C7.3 4.95 13.15 5.15001 16.85 7.35001C17.3 7.60001 17.45 8.2 17.2 8.65C16.95 9 16.35 9.14999 15.9 8.89999ZM15.8 11.7C15.55 12.05 15.1 12.2 14.75 11.95C12.05 10.3 7.95 9.80001 4.8 10.8C4.4 10.9 3.95 10.7 3.85 10.3C3.75 9.9 3.95 9.45 4.35 9.35C8 8.25 12.5 8.8 15.6 10.7C15.9 10.85 16.05 11.35 15.8 11.7ZM14.6 14.45C14.4 14.75 14.05 14.85 13.75 14.65C11.4 13.2 8.45 12.9 4.95 13.7C4.6 13.8 4.3 13.55 4.2 13.25C4.1 12.9 4.35 12.6 4.65 12.5C8.45 11.65 11.75 12 14.35 13.6C14.7 13.75 14.75 14.15 14.6 14.45ZM10 0C4.5 0 0 4.5 0 10C0 15.5 4.5 20 10 20C15.5 20 20 15.5 20 10C20 4.5 15.55 0 10 0Z" fill="white"/>
          </svg>
          <span className="text-white text-xs font-medium">Link to Spotify</span>
        </button>

        {/* Apple Music Button */}
        <button
          onClick={openAppleMusic}
          className="flex flex-1 h-8 px-2 py-1 justify-center items-center gap-2 rounded-lg border border-emotion-face bg-emotion-mouth transition-all duration-200 hover:scale-105 sm:px-3 sm:py-1.5 lg:h-8"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 21 20" fill="none">
            <g clipPath="url(#clip0_160_1414)">
              <rect x="0.5" width="20" height="20" rx="5" fill="white"/>
              <path d="M8.27342 14.0234V7.77344C8.27342 7.53907 8.40363 7.39584 8.66405 7.34375L14.0547 6.25C14.3411 6.19792 14.4974 6.32813 14.5234 6.64063V11.4063C14.5234 11.7969 13.9375 12.0573 12.7656 12.1875C10.539 12.5391 10.8906 16.2891 13.9375 15.2734C15.1094 14.8438 15.3047 13.7109 15.3047 12.5781V3.4375C15.3047 3.4375 15.3047 2.65625 14.6406 2.85157L7.99998 4.21875C7.99998 4.21875 7.49217 4.29688 7.49217 4.92188V12.8516C7.49217 13.2422 6.90623 13.5026 5.73436 13.6328C3.5078 13.9844 3.85936 17.7344 6.90623 16.7188C8.07811 16.2891 8.27342 15.1563 8.27342 14.0234Z" fill="#FF8B7E"/>
            </g>
            <defs>
              <clipPath id="clip0_160_1414">
                <rect x="0.5" width="20" height="20" rx="5" fill="white"/>
              </clipPath>
            </defs>
          </svg>
          <span className="text-white text-xs font-medium">Link to Apple Music</span>
        </button>

        {/* YouTube Music Button - Clean Icon */}
        <button
          onClick={openYouTubeMusic}
          className="flex flex-1 h-8 px-2 py-1 justify-center items-center gap-2 rounded-lg border border-emotion-face bg-flowkit-red transition-all duration-200 hover:scale-105 sm:px-3 sm:py-1.5 lg:h-8"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="white"/>
            <circle cx="12" cy="12" r="6" fill="white"/>
            <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="#FC5555"/>
          </svg>
          <span className="text-white text-xs font-medium">Link to Youtube Music</span>
        </button>
      </div>

      {/* Playlists Section - Horizontal Scrolling Layout */}
      <div className="relative flex flex-col gap-1 border border-emotion-face rounded-xl p-3 lg:p-4">
        {/* Playlists Header - Auto-updating */}
        <div className="flex items-center justify-between py-2 px-3">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-black">Playlists</span>
            {initialGenresRef.current && initialGenresRef.current.length > 0 && (
              <span className="text-xs text-emotion-default opacity-75">
                Current: {initialGenresRef.current.join(', ')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-emotion-default">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Auto-updating</span>
          </div>
        </div>

        {/* Music Tracks - 2 per row with vertical scrolling */}
        <div className="max-h-32 overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-3 pr-1">
            {tracks.map((track, index) => (
              <button
                key={track.id}
                onClick={() => {
                  try {
                    console.log('🎵 Playing track:', track.title);
                    playTrack(track);
                  } catch (error) {
                    console.error('Error in track onClick:', error);
                  }
                }}
                className="flex items-center gap-2 bg-white border border-emotion-face rounded-lg p-2 hover:bg-gray-50 transition-colors"
              >
                <div className="w-6 h-6 bg-emotion-orange rounded-lg flex-shrink-0"></div>
                <div className="flex-1 min-w-0 py-1">
                  <p className="text-xs font-medium text-emotion-default truncate text-left">{track.title}</p>
                  <p className="text-xs text-emotion-default truncate opacity-75 text-left">{track.artist}</p>
                </div>
                <span className="text-xs text-emotion-default w-10 text-right flex-shrink-0">{formatTime(track.duration)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Show loading or message if no tracks */}
        {tracks.length === 0 && (
          <div className="text-center py-8">
            {(isLoadingTracks || isUpdating) ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emotion-orange border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-gray-500">
                  {isUpdating ? 'Updating playlists...' : 'Loading your music...'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v18.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5V12.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5V21.5M12 6l6-2v13.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5V8.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v13.5" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
                <p className="text-xs text-gray-500">Select music genres to load playlists</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Show updating overlay if tracks exist but we're updating */}
      {isUpdating && tracks.length > 0 && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-emotion-orange border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-500">Updating playlists...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicPlaylists;
