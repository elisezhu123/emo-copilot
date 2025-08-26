import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar';
import HeartRateMonitor from '../components/HeartRateMonitor';
import DriverState from '../components/DriverState';
import MusicProgressBar from '../components/MusicProgressBar';
import ACFace from '../components/ACFace';
import LightingFace from '../components/LightingFace';
import MusicFace from '../components/MusicFace';
import HappyFace from '../components/HappyFace';
import EnjoyFace from '../components/EnjoyFace';
import HotFace from '../components/HotFace';
import { Track, musicService } from '../services/musicService';
import { audioManager, AudioState } from '../services/audioManager';
import { simpleMusicService } from '../services/simpleMusicService';
import { carStateManager, type CarState } from '../services/carStateManager';

const EmoCopilotDashboard = () => {
  const navigate = useNavigate();
  const [isCoolingOn, setIsCoolingOn] = useState(false);
  const [isLightingOn, setIsLightingOn] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  const [showMusicEmoji, setShowMusicEmoji] = useState(false);
  const [showAIBotEmoji, setShowAIBotEmoji] = useState(false);
  const [showEnjoyEmoji, setShowEnjoyEmoji] = useState(false);
  const [showHotEmoji, setShowHotEmoji] = useState(false);
  const [showACEmoji, setShowACEmoji] = useState(false);
  const [showLightingEmoji, setShowLightingEmoji] = useState(false);
  const [musicStartTime, setMusicStartTime] = useState<number | null>(null);
  const [musicTimer, setMusicTimer] = useState<NodeJS.Timeout | null>(null);
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
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Car state from global manager
  const [globalCarState, setGlobalCarState] = useState<CarState>(carStateManager.getState());

  // Subscribe to global car state changes
  useEffect(() => {
    let previousState = carStateManager.getState();
    
    const unsubscribe = carStateManager.subscribe((newState) => {
      setGlobalCarState(newState);
      // Update local states to match global state
      setIsCoolingOn(newState.isAcOn);
      setIsLightingOn(newState.lightsOn);
      console.log('🚗 Dashboard synced with global car state:', newState);
      
      // Check if driver state changed to stressed
      if (previousState.driverState !== 'stressed' && newState.driverState === 'stressed') {
        console.log('🚨 Stress detected! Navigating to AI chatbot for music therapy...');
        
        // Navigate to AI chatbot page with stress indication
        setTimeout(() => {
          navigate('/ai-chatbot?stress=true');
        }, 1000);
      }
      
      previousState = newState;
    });

    // Initialize with current state
    const currentState = carStateManager.getState();
    setGlobalCarState(currentState);
    setIsCoolingOn(currentState.isAcOn);
    setIsLightingOn(currentState.lightsOn);

    return unsubscribe;
  }, [navigate]);

  // Wake word recognition ref removed - no longer using microphone on dashboard

  // Microphone permissions are now only requested on AI Chatbot page to prevent Safari conflicts

  // Wake word detection removed from dashboard to prevent Safari microphone permission conflicts

  // Wake word listening function removed - no longer needed on dashboard

  // Enable audio on first user interaction
  useEffect(() => {
    const enableAudio = () => {
      setAudioEnabled(true);
      console.log('🎵 Audio enabled by user interaction');
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };

    document.addEventListener('click', enableAudio);
    document.addEventListener('touchstart', enableAudio);

    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };
  }, []);

  // Load music from Freesound with CORS handling
  useEffect(() => {
    const loadMusic = async () => {
      // Check if there are selected genres
      const savedGenres = musicService.loadSelectedGenres();
      
      if (savedGenres && savedGenres.length > 0) {
        console.log('🎲 Loading DYNAMIC music for selected genres:', savedGenres);

        // Use dynamic loading for fresh playlists every time
        await simpleMusicService.forceFreshReload(savedGenres);

        // Get fresh dynamic tracks from service
        const allTracks = await simpleMusicService.getAllTracks();
        setPlaylist(allTracks);

        if (allTracks.length > 0) {
          setCurrentTrack(allTracks[0]);
          // Set playlist in audio manager for continuous playback
          audioManager.setPlaylist(allTracks);
          console.log('🎲 Dynamic music loaded but not auto-playing. User must click play.');
        } else {
          // Set playlist in audio manager for continuous playback
          audioManager.setPlaylist(allTracks);
        }

        console.log('🎲 Loaded dynamic playlist with', allTracks.length, 'tracks from Freesound');
      } else {
        console.log('🎵 No genres selected, no music will be loaded');
        setPlaylist([]);
        setCurrentTrack(null);
        // Clear playlist in audio manager
        audioManager.setPlaylist([]);
      }
    };

    loadMusic();

    // Subscribe to audio state changes
    const unsubscribe = audioManager.subscribe((state: AudioState) => {
      setAudioState(state);

      // Update current track if it's different
      const audioTrack = audioManager.getCurrentTrack();
      if (audioTrack && audioTrack.id !== currentTrack?.id) {
        setCurrentTrack(audioTrack);
      }

      // Update current track index
      const playlistInfo = audioManager.getPlaylistInfo();
      setCurrentTrackIndex(playlistInfo.current);

      // Start 10-minute timer when music starts playing
      if (state.isPlaying && !musicStartTime) {
        const startTime = Date.now();
        setMusicStartTime(startTime);

        // Set timer for 10 minutes (600,000 milliseconds)
        const timer = setTimeout(() => {
          setShowEnjoyEmoji(true);
          setTimeout(() => {
            setShowEnjoyEmoji(false);
          }, 3000); // Show for 3 seconds
        }, 600000); // 10 minutes

        setMusicTimer(timer);
        console.log('🎵 Started 10-minute music timer');
      }

      // Clear timer if music stops
      if (!state.isPlaying && musicTimer) {
        clearTimeout(musicTimer);
        setMusicTimer(null);
        setMusicStartTime(null);
        console.log('🎵 Cleared music timer');
      }
    });

    // Refresh playlist when window gains focus (user returns from music selection)
    const handleFocus = () => {
      loadMusic();
    };

    window.addEventListener('focus', handleFocus);

    // Check temperature periodically (every 30 seconds)
    const tempCheckInterval = setInterval(checkTemperatureAndShowHotEmoji, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(tempCheckInterval);
      unsubscribe();
      // Clean up music timer
      if (musicTimer) {
        clearTimeout(musicTimer);
      }
    };
  }, [audioEnabled]);

  // Update playlist when returning from music selection - with dynamic results
  const refreshPlaylist = async () => {
    // Reload music based on newly selected genres with fresh dynamic results
    const savedGenres = musicService.loadSelectedGenres();

    if (savedGenres && savedGenres.length > 0) {
      console.log('🎲 Refreshing playlist with DYNAMIC music for genres:', savedGenres);

      // Force fresh dynamic reload
      await simpleMusicService.forceFreshReload(savedGenres);

      const allTracks = await simpleMusicService.getAllTracks();
      setPlaylist(allTracks);

      if (allTracks.length > 0) {
        setCurrentTrack(allTracks[0]);

        // Set playlist in audio manager for continuous playback
        audioManager.setPlaylist(allTracks);

        console.log('🎲 Dynamic music ready to play after genre selection. User must click play.');
      } else {
        // Set playlist in audio manager for continuous playback
        audioManager.setPlaylist(allTracks);
      }

      console.log('🎲 Dynamic playlist refreshed with', allTracks.length, 'tracks');
    } else {
      console.log('🎵 No genres selected, clearing playlist');
      setPlaylist([]);
      setCurrentTrack(null);
      // Clear playlist in audio manager
      audioManager.setPlaylist([]);
    }
  };

  const togglePlayPause = async () => {
    try {
      // Check if user has selected any genres
      const savedGenres = musicService.loadSelectedGenres();
      
      if (!savedGenres || savedGenres.length === 0) {
        alert('请先在音乐选择页面选择您喜欢的音乐类型！\nPlease select your preferred music genres in the Music Selection page first!');
        return;
      }
      
      if (!audioState.isPlaying && !currentTrack) {
        console.log('🎵 Getting random track...');
        
        // Get a random track from Freesound with proper CORS handling
        const randomTrack = await simpleMusicService.getRandomTrack();
        console.log('🎵 Selected track:', randomTrack);

        if (!randomTrack.url) {
          throw new Error('No valid audio URL found');
        }

        try {
          console.log('🎵 Attempting to play:', randomTrack.url);
          await audioManager.playTrack(randomTrack);
          setCurrentTrack(randomTrack);
          console.log('✅ Playback started successfully');
        } catch (audioError) {
          console.error('❌ Track playback failed:', audioError);
          
          // Show specific error message to user
          const errorMsg = audioError.message || 'Unknown audio error';
          alert(`Audio playback failed: ${errorMsg}\n\nTry clicking anywhere on the page first to enable audio.`);
        }
      } else if (currentTrack) {
        // Toggle play/pause for current track
        console.log('🎵 Toggling playback for:', currentTrack.title);
        await audioManager.togglePlay();
      } else {
        alert('Please wait for music to load...');
      }
    } catch (error) {
      console.error('❌ Error in togglePlayPause:', error);
      alert(`Error: ${error.message || 'Unknown error'}\n\nPlease check the browser console for details.`);
    }
  };

  const toggleMute = () => {
    audioManager.toggleMute();
  };

  const playNextTrack = async () => {
    try {
      await audioManager.playNextTrack();
    } catch (error) {
      console.error('❌ Error playing next track:', error);
    }
  };

  const playPreviousTrack = async () => {
    try {
      await audioManager.playPreviousTrack();
    } catch (error) {
      console.error('❌ Error playing previous track:', error);
    }
  };

  const toggleFavorite = () => {
    setIsFavorited(!isFavorited);
    console.log('🎵 Track', isFavorited ? 'removed from' : 'added to', 'favorites');
  };

  // Text-to-speech function
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const toggleCooling = () => {
    const newState = !isCoolingOn;
    setIsCoolingOn(newState);

    // Update global state
    carStateManager.setAirConditioner(globalCarState.acTemperature, newState);

    speakText(newState ? "Air conditioner turned on" : "Air conditioner turned off");

    // Show AC emoji for 3 seconds only when turning ON
    if (newState) {
      setShowACEmoji(true);
      setTimeout(() => setShowACEmoji(false), 3000);
    }
  };

  const toggleLighting = () => {
    const newState = !isLightingOn;
    setIsLightingOn(newState);

    // Update global state
    carStateManager.setLights(newState);

    speakText(newState ? "Lighting turned on" : "Lighting turned off");

    // Show Lighting emoji for 3 seconds only when turning ON
    if (newState) {
      setShowLightingEmoji(true);
      setTimeout(() => setShowLightingEmoji(false), 3000);
    }
  };

  // Check temperature and show hot emoji if > 35°C
  const checkTemperatureAndShowHotEmoji = () => {
    // Get temperature from the status bar display
    const temperatureElement = document.querySelector('[data-temperature]');
    if (!temperatureElement) {
      // Fallback: check if any element contains "Temperature:" text
      const statusElements = document.querySelectorAll('span');
      for (const element of statusElements) {
        const text = element.textContent || '';
        if (text.includes('Temperature:')) {
          const tempMatch = text.match(/Temperature: (\d+)°C/);
          if (tempMatch) {
            const temp = parseInt(tempMatch[1]);
            if (temp > 35 && !showHotEmoji) {
              console.log('🌡️ Temperature is hot:', temp + '°C - showing hot emoji');
              setShowHotEmoji(true);
              setTimeout(() => setShowHotEmoji(false), 3000);
              return;
            }
          }
        }
      }
    }
  };

  // Simplified emoji functions
  const showMusicFaceEmoji = () => {
    console.log('🎵 Showing music face emoji');
    setShowMusicEmoji(true);
    setTimeout(() => setShowMusicEmoji(false), 3000);
  };

  const showAIBotFaceEmoji = () => {
    console.log('🤖 Showing AI bot face emoji');
    setShowAIBotEmoji(true);
    setTimeout(() => setShowAIBotEmoji(false), 3000);
  };

  // Add global function to trigger hot emoji (can be called from console or other components)
  React.useEffect(() => {
    (window as any).triggerHotEmoji = () => {
      console.log('🌡️ Manually triggering hot emoji');
      setShowHotEmoji(true);
      setTimeout(() => setShowHotEmoji(false), 3000);
    };

    (window as any).checkTemperature = checkTemperatureAndShowHotEmoji;

    return () => {
      delete (window as any).triggerHotEmoji;
      delete (window as any).checkTemperature;
    };
  }, [showHotEmoji]);

  return (
    <div className="min-h-screen bg-white px-3 py-2 max-w-md mx-auto lg:max-w-4xl xl:max-w-6xl">
      {/* Status Bar */}
      <StatusBar
        title="Emo Copilot"
        showHomeButton={false}
        showTemperature={true}
      />

      {/* Conditional Content - Show emoji dashboard or normal dashboard */}
      {false ? (
        <></>

      ) : showMusicEmoji ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] w-full p-2">
          <div className="animate-bounce w-full h-[calc(100vh-100px)]">
            {/* Happy music face with musical notes from Figma design */}
            <MusicFace />
          </div>
        </div>
      ) : showAIBotEmoji ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] w-full p-2">
          <div className="animate-bounce w-full h-[calc(100vh-100px)]">
            {/* Happy AI bot face from Figma design */}
            <HappyFace />
          </div>
        </div>
      ) : showEnjoyEmoji ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] w-full p-2">
          <div className="animate-bounce w-full h-[calc(100vh-100px)]">
            {/* Enjoy face after 10 minutes of music from Figma design */}
            <EnjoyFace />
          </div>
        </div>
      ) : showHotEmoji ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] w-full p-2">
          <div className="animate-bounce" style={{width: '70vw', height: '70vh'}}>
            {/* Hot face when temperature > 35°C from Figma design */}
            <HotFace />
          </div>
        </div>
      ) : (
        <>
          {/* Main Content Container */}
          <div className="space-y-3 lg:space-y-6">{/* Heart Rate Section */}
        <div className="bg-white border border-emotion-face rounded-xl p-3 backdrop-blur-sm lg:p-6">
          <div className="flex items-end gap-4 lg:gap-8">
            {/* Dynamic Heart Rate Monitor */}
            <HeartRateMonitor />

            {/* Emotion Analysis */}
            <div className="flex-1 space-y-3 lg:space-y-4">
              <div className="text-center">
                <h3 className="text-base font-medium text-black lg:text-xl">Emotion Analysis</h3>
                <p className="text-xs text-black lg:text-sm">Real-time Detection</p>
              </div>
              <div className="grid grid-cols-3 gap-1 lg:gap-2">
                <span className="px-2 py-1 bg-flowkit-red text-white text-xs text-center rounded-xl border border-emotion-face lg:px-3 lg:py-2 lg:text-sm">Anxious</span>
                <span className="px-2 py-1 bg-emotion-mouth text-white text-xs text-center rounded-xl border border-emotion-face lg:px-3 lg:py-2 lg:text-sm">Stressed</span>
                <span className="px-2 py-1 bg-emotion-default text-white text-xs text-center rounded-xl border border-emotion-face lg:px-3 lg:py-2 lg:text-sm">Neutral</span>
                <span className="px-2 py-1 bg-emotion-orange text-white text-xs text-center rounded-xl border border-emotion-face lg:px-3 lg:py-2 lg:text-sm">Focused</span>
                <span className="px-2 py-1 bg-emotion-blue text-white text-xs text-center rounded-xl border border-emotion-face lg:px-3 lg:py-2 lg:text-sm">Calm</span>
                <span className="px-2 py-1 bg-flowkit-green text-white text-xs text-center rounded-xl border border-emotion-face lg:px-3 lg:py-2 lg:text-sm">Relaxed</span>
              </div>
            </div>

            {/* Dynamic Driver State */}
            <DriverState />
          </div>
        </div>

        {/* Music Player */}
        <div
          className="bg-white border border-emotion-face rounded-xl p-2 lg:p-4 cursor-move"
          draggable="true"
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', '');
            e.currentTarget.style.opacity = '0.5';
          }}
          onDragEnd={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <div className="flex items-center gap-2 mb-2 lg:gap-4 lg:mb-4">
            <div className="w-12 h-12 bg-emotion-orange rounded-lg lg:w-16 lg:h-16 flex items-center justify-center">
              <svg className="w-6 h-6 lg:w-8 lg:h-8" viewBox="0 0 24 24" fill="none">
                <path d="M12 3V20.5C12 21.3284 11.3284 22 10.5 22H9.5C8.67157 22 8 21.3284 8 20.5V11.5C8 10.6716 8.67157 10 9.5 10H10.5C11.3284 10 12 10.6716 12 11.5V20.5ZM12 3V20.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 7L18 5V18.5C18 19.3284 17.3284 20 16.5 20H15.5C14.6716 20 14 19.3284 14 18.5V9.5C14 8.67157 14.6716 8 15.5 8H16.5C17.3284 8 18 8.67157 18 9.5V18.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-base font-medium text-black lg:text-xl">
                {currentTrack ? currentTrack.title : 'Select music genres first, then click play'}
              </h4>
              <p className="text-xs text-emotion-default lg:text-sm">
                {currentTrack ? (
                  <>
                    {currentTrack.artist} • {currentTrack.genre}
                    {playlist.length > 1 && (
                      <span className="ml-2 text-emotion-orange">
                        ({currentTrackIndex + 1}/{playlist.length})
                      </span>
                    )}
                  </>
                ) : (
                  'Select music genres first to load tracks'
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Previous Track Button */}
              <button
                className="p-1 lg:p-2 transition-all duration-200 hover:scale-105"
                onClick={playPreviousTrack}
                disabled={playlist.length <= 1 || currentTrackIndex <= 0}
                style={{ 
                  opacity: (playlist.length <= 1 || currentTrackIndex <= 0) ? 0.3 : 1
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
                disabled={playlist.length <= 1 || currentTrackIndex >= playlist.length - 1}
                style={{ 
                  opacity: (playlist.length <= 1 || currentTrackIndex >= playlist.length - 1) ? 0.3 : 1
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

          {/* Music Progress Bar */}
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
              <p className="text-xs text-flowkit-red mt-1">
                Audio Error: {audioState.error}
              </p>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-2 p-2 border border-emotion-face rounded-xl lg:grid-cols-4 lg:gap-4 lg:p-4">
          <button
            onClick={() => {
              console.log('AI Chatbot button clicked');
              navigate('/ai-chatbot');
            }}
            className="flex items-center justify-center gap-2 bg-emotion-mouth text-white text-xs font-medium py-2 px-3 rounded-md border border-emotion-face lg:text-sm lg:py-3 lg:px-4 hover:scale-105 transition-transform duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
              <path d="M12.5 6C11.9477 6 11.5 6.44772 11.5 7C11.5 7.55228 11.9477 8 12.5 8C13.0523 8 13.5 7.55228 13.5 7C13.5 6.44772 13.0523 6 12.5 6ZM7.5 7C7.5 6.44772 7.94772 6 8.5 6C9.05228 6 9.5 6.44772 9.5 7C9.5 7.55228 9.05228 8 8.5 8C7.94772 8 7.5 7.55228 7.5 7ZM11 3C11 2.72386 10.7761 2.5 10.5 2.5C10.2239 2.5 10 2.72386 10 3V3.5H7C6.17157 3.5 5.5 4.17157 5.5 5V9C5.5 9.82843 6.17157 10.5 7 10.5H14C14.8284 10.5 15.5 9.82843 15.5 9V5C15.5 4.17157 14.8284 3.5 14 3.5H11V3ZM7 4.5H14C14.2761 4.5 14.5 4.72386 14.5 5V9C14.5 9.27614 14.2761 9.5 14 9.5H7C6.72386 9.5 6.5 9.27614 6.5 9V5C6.5 4.72386 6.72386 4.5 7 4.5ZM10.75 18.4984C13.3656 18.4649 14.9449 17.9031 15.8718 17.0574C16.747 16.2588 16.9607 15.2813 16.9947 14.5019H17V13.8124C17 12.8131 16.19 12.0031 15.1907 12.0031H12V12H9V12.0031H5.8093C4.81005 12.0031 4 12.8131 4 13.8124V14.5019H4.00533C4.03931 15.2813 4.25297 16.2588 5.1282 17.0574C6.05506 17.9031 7.63442 18.4649 10.25 18.4984V18.5H10.75V18.4984ZM5.8093 13.0031H15.1907C15.6377 13.0031 16 13.3654 16 13.8124V14.25C16 14.9396 15.8688 15.7064 15.1978 16.3187C14.5103 16.946 13.1605 17.5 10.5 17.5C7.83946 17.5 6.48969 16.946 5.80224 16.3187C5.13123 15.7064 5 14.9396 5 14.25V13.8124C5 13.3654 5.36233 13.0031 5.8093 13.0031Z" fill="white"/>
            </svg>
            AI Chatbot
          </button>
          
          <button
            onClick={() => {
              console.log('Music Selection button clicked');
              navigate('/music-selection');
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-emotion-orange text-white text-xs font-medium py-2 px-3 rounded-md border border-emotion-face lg:text-sm lg:py-3 lg:px-4 hover:scale-105 transition-transform duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
              <path d="M15.5351 2.72561C16.179 2.52439 16.8334 3.00545 16.8334 3.68009V14C16.8334 15.3807 15.7141 16.5 14.3334 16.5C12.9527 16.5 11.8334 15.3807 11.8334 14C11.8334 12.6193 12.9527 11.5 14.3334 11.5C14.8962 11.5 15.4155 11.686 15.8334 11.9998V6.68009L8.83337 8.8676V16C8.83337 17.3807 7.71409 18.5 6.33337 18.5C4.95266 18.5 3.83337 17.3807 3.83337 16C3.83337 14.6193 4.95266 13.5 6.33337 13.5C6.89618 13.5 7.41554 13.686 7.83337 13.9998V5.86759C7.83337 5.43021 8.11762 5.04358 8.5351 4.91311L15.5351 2.72561ZM8.83337 7.8199L15.8334 5.6324V3.68009L8.83337 5.86759V7.8199ZM6.33337 14.5C5.50495 14.5 4.83337 15.1716 4.83337 16C4.83337 16.8284 5.50495 17.5 6.33337 17.5C7.1618 17.5 7.83337 16.8284 7.83337 16C7.83337 15.1716 7.1618 14.5 6.33337 14.5ZM12.8334 14C12.8334 14.8284 13.5049 15.5 14.3334 15.5C15.1618 15.5 15.8334 14.8284 15.8334 14C15.8334 13.1716 15.1618 12.5 14.3334 12.5C13.5049 12.5 12.8334 13.1716 12.8334 14Z" fill="white"/>
            </svg>
            Select Music
          </button>
          
          <button
            onClick={toggleCooling}
            className={`flex-1 flex items-center justify-center gap-2 text-white text-xs font-medium py-2 px-3 rounded-md border border-emotion-face lg:text-sm lg:py-3 lg:px-4 transition-all duration-200 hover:scale-105 ${
              isCoolingOn ? 'bg-emotion-blue-dark' : 'bg-emotion-blue'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
              <path d="M10.6666 7C10.9428 7 11.1666 7.22386 11.1666 7.5V12.563C12.0292 12.785 12.6666 13.5681 12.6666 14.5C12.6666 15.6046 11.7712 16.5 10.6666 16.5C9.56206 16.5 8.66663 15.6046 8.66663 14.5C8.66663 13.5681 9.30401 12.785 10.1666 12.563V7.5C10.1666 7.22386 10.3905 7 10.6666 7ZM10.6666 2.5C9.00977 2.5 7.66663 3.84315 7.66663 5.5L7.6667 11.8541C7.0447 12.5589 6.66663 13.4857 6.66663 14.5C6.66663 16.7091 8.45749 18.5 10.6666 18.5C12.8758 18.5 14.6666 16.7091 14.6666 14.5C14.6666 13.4857 14.2886 12.5589 13.6665 11.8541L13.6666 5.5C13.6666 3.84315 12.3235 2.5 10.6666 2.5ZM10.6666 3.5C11.7712 3.5 12.6666 4.39543 12.6666 5.5L12.6665 12.2546L12.8094 12.4004C13.3402 12.942 13.6666 13.6824 13.6666 14.5C13.6666 16.1568 12.3235 17.5 10.6666 17.5C9.00977 17.5 7.66663 16.1568 7.66663 14.5C7.66663 13.6824 7.99305 12.942 8.52381 12.4004L8.6667 12.2546L8.66663 5.5C8.66663 4.39543 9.56206 3.5 10.6666 3.5Z" fill="white"/>
            </svg>
            Cooling AC
          </button>
          
          <button
            onClick={toggleLighting}
            className={`flex-1 flex items-center justify-center gap-2 text-white text-xs font-medium py-2 px-3 rounded-md border border-emotion-face lg:text-sm lg:py-3 lg:px-4 transition-all duration-200 hover:scale-105 ${
              isLightingOn ? 'bg-flowkit-green-dark' : 'bg-flowkit-green'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
              <path d="M10.5 2.5C13.8137 2.5 16.5 5.09693 16.5 8.30041C16.5 9.97737 15.7546 11.5164 14.2961 12.8942C14.2324 12.9544 14.1831 13.0269 14.1512 13.1065L14.1251 13.1883L13.1891 17.1051C13.0048 17.8763 12.3236 18.435 11.5181 18.4947L11.3748 18.5H9.62546C8.80655 18.5 8.09 17.9839 7.84866 17.2385L7.81108 17.1047L6.87626 13.1886C6.84955 13.0766 6.79016 12.9745 6.70516 12.8942C5.3153 11.5819 4.57265 10.1235 4.50507 8.53903L4.5 8.30041L4.50321 8.10894C4.6077 4.99409 7.25257 2.5 10.5 2.5ZM12.545 15.5H8.455L8.77386 16.8344L8.80004 16.9305C8.89695 17.2298 9.17583 17.4517 9.5116 17.493L9.62546 17.5L11.3379 17.5007L11.4442 17.4974C11.7865 17.4721 12.0726 17.2609 12.1854 16.9718L12.2165 16.8727L12.545 15.5ZM10.5 3.5C7.86782 3.5 5.71188 5.45301 5.5151 7.91357L5.50307 8.12569L5.49977 8.27916L5.50416 8.49642C5.55977 9.80026 6.17758 11.0208 7.39167 12.1671C7.57995 12.3449 7.72191 12.5647 7.80572 12.8078L7.84894 12.9564L8.216 14.5H12.785L13.1722 12.8851L13.2231 12.7343C13.3091 12.5198 13.4409 12.3265 13.6094 12.1673C14.8825 10.9646 15.5 9.68054 15.5 8.30041C15.5 5.65693 13.2689 3.5 10.5 3.5Z" fill="white"/>
            </svg>
            Lighting
          </button>
        </div>
        </div>
        </>
      )}

      {/* AC Emoji Popup Overlay */}
      {showACEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-[480px] max-h-[280px] w-[480px] h-[280px] flex items-center justify-center animate-spontaneous-pop shadow-2xl">
            <ACFace />
          </div>
        </div>
      )}

      {/* Lighting Emoji Popup Overlay */}
      {showLightingEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-[480px] max-h-[280px] w-[480px] h-[280px] flex items-center justify-center animate-spontaneous-pop shadow-2xl">
            <LightingFace />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmoCopilotDashboard;
