import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatusBar from '../components/StatusBar';
import MusicProgressBar from '../components/MusicProgressBar';
import { Track, musicService } from '../services/musicService';
import { audioManager, AudioState } from '../services/audioManager';
import { simpleMusicService } from '../services/simpleMusicService';

const EmoCopilotDashboard = () => {
  const [isCoolingOn, setIsCoolingOn] = useState(false);
  const [isLightingOn, setIsLightingOn] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>([]);
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
  const [isFavorited, setIsFavorited] = useState(false);

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
        console.log('🎵 Loading music for selected genres:', savedGenres);
        await simpleMusicService.updateGenres(savedGenres);
        
        // Get tracks from service
        const allTracks = await simpleMusicService.getAllTracks();
        setPlaylist(allTracks);

        if (allTracks.length > 0 && !currentTrack) {
          setCurrentTrack(allTracks[0]);
        }
        
        console.log('🎵 Loaded playlist with', allTracks.length, 'tracks from Freesound');
      } else {
        console.log('🎵 No genres selected, no music will be loaded');
        setPlaylist([]);
        setCurrentTrack(null);
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
    });

    // Refresh playlist when window gains focus (user returns from music selection)
    const handleFocus = () => {
      loadMusic();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      unsubscribe();
    };
  }, [currentTrack]);

  // Update playlist when returning from music selection
  const refreshPlaylist = async () => {
    // Reload music based on newly selected genres
    const savedGenres = musicService.loadSelectedGenres();
    
    if (savedGenres && savedGenres.length > 0) {
      console.log('🎵 Refreshing playlist for genres:', savedGenres);
      await simpleMusicService.updateGenres(savedGenres);
      
      const allTracks = await simpleMusicService.getAllTracks();
      setPlaylist(allTracks);

      if (allTracks.length > 0) {
        setCurrentTrack(allTracks[0]);
      }
      
      console.log('🎵 Playlist refreshed with', allTracks.length, 'tracks');
    } else {
      console.log('🎵 No genres selected, clearing playlist');
      setPlaylist([]);
      setCurrentTrack(null);
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
      if (playlist.length === 0) {
        alert('No music available. Please select genres first!');
        return;
      }

      // Find current track index
      const currentIndex = currentTrack ? playlist.findIndex(track => track.id === currentTrack.id) : -1;

      // Get next track (avoid repeating the same track)
      let nextIndex;
      if (currentIndex === -1 || currentIndex === playlist.length - 1) {
        // If no current track or at end, start from beginning
        nextIndex = 0;
      } else {
        // Go to next track
        nextIndex = currentIndex + 1;
      }

      const nextTrack = playlist[nextIndex];

      if (nextTrack && nextTrack.id !== currentTrack?.id) {
        console.log('🎵 Playing next track:', nextTrack.title);
        await audioManager.playTrack(nextTrack);
        setCurrentTrack(nextTrack);
      }
    } catch (error) {
      console.error('❌ Error playing next track:', error);
      alert(`Error playing next track: ${error.message}`);
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
    speakText(newState ? "Air conditioner turned on" : "Air conditioner turned off");
  };

  const toggleLighting = () => {
    const newState = !isLightingOn;
    setIsLightingOn(newState);
    speakText(newState ? "Lighting turned on" : "Lighting turned off");
  };

  return (
    <div className="min-h-screen bg-white px-3 py-2 max-w-md mx-auto lg:max-w-4xl xl:max-w-6xl">
      {/* Status Bar */}
      <StatusBar 
        title="Emo Copilot" 
        showHomeButton={false}
        showTemperature={true}
      />
      
      {/* Main Content Container */}
      <div className="space-y-3 lg:space-y-6">{/* Heart Rate Section */}
        <div className="bg-white border border-emotion-face rounded-xl p-3 backdrop-blur-sm lg:p-6">
          <div className="flex items-end gap-4 lg:gap-8">
            {/* Heart Rate Monitor */}
            <div className="flex flex-col items-center gap-2 w-28 lg:w-40">
              <div className="flex items-center gap-2 lg:gap-3">
                <svg className="w-12 h-12 lg:w-16 lg:h-16" viewBox="0 0 49 48" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M18.4235 38.7414C12.5389 33.9428 4.5 26.0158 4.5 18.5209C4.5 6.699 15.5003 1.32527 24.5 10.9975C33.4996 1.32527 44.5 6.69862 44.5 18.5208C44.5 26.016 36.4612 33.9428 30.5766 38.7414C27.9126 40.9138 26.5806 42 24.5 42C22.4194 42 21.0874 40.9138 18.4235 38.7414ZM20.6864 21.4926C20.8654 21.2368 21.0142 21.0244 21.1466 20.8426C21.2586 21.0376 21.3836 21.2648 21.534 21.5384L24.9546 27.7574C25.2866 28.3616 25.6124 28.9542 25.9394 29.3842C26.2894 29.8442 26.9046 30.4748 27.8908 30.4932C28.8768 30.5118 29.5154 29.9048 29.8824 29.4582C30.2254 29.0408 30.573 28.461 30.9276 27.8698L31.0384 27.685C31.48 26.949 31.758 26.4888 32.004 26.1564C32.2308 25.8502 32.3618 25.7502 32.4596 25.695C32.5572 25.6396 32.7104 25.5788 33.0896 25.5418C33.5012 25.5018 34.0388 25.5002 34.8972 25.5002H36.5C37.3284 25.5002 38 24.8286 38 24.0002C38 23.1718 37.3284 22.5002 36.5 22.5002H34.8324C34.0582 22.5002 33.3734 22.5002 32.7994 22.556C32.177 22.6164 31.5714 22.7502 30.9814 23.0844C30.3914 23.4184 29.965 23.8688 29.593 24.3714C29.2498 24.8348 28.8976 25.422 28.4992 26.086L28.4042 26.2444C28.2308 26.5336 28.086 26.7744 27.9568 26.9812C27.8352 26.7698 27.6998 26.5236 27.5372 26.2282L24.1184 20.012C23.8102 19.4512 23.503 18.8925 23.1916 18.4829C22.8512 18.0355 22.2678 17.4439 21.3328 17.3934C20.3977 17.3429 19.754 17.8683 19.3675 18.2765C19.0137 18.6501 18.6482 19.1725 18.2814 19.6968L17.6626 20.5808C17.2083 21.2298 16.9235 21.6342 16.677 21.9258C16.45 22.1942 16.3239 22.2822 16.2308 22.3306C16.1376 22.3792 15.9933 22.432 15.6432 22.464C15.2629 22.4988 14.7683 22.5002 13.9761 22.5002H12.5C11.6716 22.5002 11 23.1718 11 24.0002C11 24.8286 11.6716 25.5002 12.5 25.5002H14.0362C14.7502 25.5002 15.3831 25.5002 15.916 25.4516C16.4941 25.3988 17.0581 25.2822 17.6162 24.9916C18.1743 24.701 18.5932 24.306 18.968 23.8626C19.3135 23.4538 19.6764 22.9354 20.0858 22.3504L20.6864 21.4926Z" fill="#FF8B7E"/>
                </svg>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-medium text-black lg:text-5xl">67</span>
                  <span className="text-xs text-black leading-none mb-1 lg:text-sm lg:mb-2">BPM</span>
                </div>
              </div>

              {/* Heart Rate Chart */}
              <div className="flex items-end gap-1 h-10 lg:h-16 lg:gap-2">
                <div className="w-2.5 h-6 bg-emotion-orange rounded-t-sm flex items-end justify-center p-0.5 lg:w-4 lg:h-10">
                  <span className="text-white text-[3px] font-medium lg:text-[5px]">72</span>
                </div>
                <div className="w-2.5 h-8 bg-emotion-orange rounded-t-sm flex items-end justify-center p-0.5 lg:w-4 lg:h-12">
                  <span className="text-white text-[3px] font-medium lg:text-[5px]">78</span>
                </div>
                <div className="w-2.5 h-6 bg-emotion-orange rounded-t-sm flex items-end justify-center p-0.5 lg:w-4 lg:h-10">
                  <span className="text-white text-[3px] font-medium lg:text-[5px]">75</span>
                </div>
                <div className="w-2.5 h-10 bg-emotion-mouth rounded-t-sm flex items-end justify-center p-0.5 lg:w-4 lg:h-16">
                  <span className="text-white text-[3px] font-medium lg:text-[5px]">95</span>
                </div>
                <div className="w-2.5 h-9 bg-emotion-orange rounded-t-sm flex items-end justify-center p-0.5 lg:w-4 lg:h-14">
                  <span className="text-white text-[3px] font-medium lg:text-[5px]">85</span>
                </div>
                <div className="w-2.5 h-5 bg-emotion-blue rounded-t-sm flex items-end justify-center p-0.5 lg:w-4 lg:h-8">
                  <span className="text-white text-[3px] font-medium lg:text-[5px]">70</span>
                </div>
                <div className="w-2.5 h-8 bg-emotion-orange rounded-t-sm flex items-end justify-center p-0.5 lg:w-4 lg:h-12">
                  <span className="text-white text-[3px] font-medium lg:text-[5px]">82</span>
                </div>
                <div className="w-2.5 h-7 bg-emotion-orange rounded-t-sm flex items-end justify-center p-0.5 lg:w-4 lg:h-11">
                  <span className="text-white text-[3px] font-medium lg:text-[5px]">76</span>
                </div>
              </div>
            </div>

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

            {/* Driver State */}
            <div className="flex flex-col items-center gap-2 w-28 lg:w-40">
              <h3 className="text-base font-medium text-black lg:text-xl">Driver State</h3>
              <div className="flex flex-col items-center gap-1 lg:gap-2">
                <div className="w-12 h-12 bg-emotion-default rounded-xl flex items-center justify-center lg:w-16 lg:h-16">
                  <svg className="w-12 h-12 lg:w-16 lg:h-16" viewBox="0 0 48 48" fill="none">
                    <g clipPath="url(#clip0_106_90)">
                      <path d="M35.2613 0H12.7387C5.70329 0 0 5.70329 0 12.7387V35.2613C0 42.2967 5.70329 48 12.7387 48H35.2613C42.2967 48 48 42.2967 48 35.2613V12.7387C48 5.70329 42.2967 0 35.2613 0Z" fill="#3A2018"/>
                      <path d="M14.5617 25.431C16.0513 25.431 17.2588 24.2235 17.2588 22.7339C17.2588 21.2444 16.0513 20.0369 14.5617 20.0369C13.0722 20.0369 11.8647 21.2444 11.8647 22.7339C11.8647 24.2235 13.0722 25.431 14.5617 25.431Z" fill="white"/>
                      <path d="M33.4382 25.431C34.9277 25.431 36.1353 24.2235 36.1353 22.7339C36.1353 21.2444 34.9277 20.0369 33.4382 20.0369C31.9487 20.0369 30.7411 21.2444 30.7411 22.7339C30.7411 24.2235 31.9487 25.431 33.4382 25.431Z" fill="white"/>
                      <path d="M39.2143 32.2373H8.78562C8.42968 32.2373 8.14319 31.9508 8.14319 31.5949C8.14319 31.2389 8.42968 30.9524 8.78562 30.9524H39.2143C39.5702 30.9524 39.8567 31.2389 39.8567 31.5949C39.8567 31.9508 39.5702 32.2373 39.2143 32.2373Z" fill="white"/>
                    </g>
                    <defs>
                      <clipPath id="clip0_106_90">
                        <rect width="48" height="48" fill="white"/>
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <span className="text-xs text-black lg:text-sm">Neutral</span>
              </div>
            </div>
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
                {currentTrack ? currentTrack.title : 'Click play to start music'}
              </h4>
              <p className="text-xs text-emotion-default lg:text-sm">
                {currentTrack ? `${currentTrack.artist} • ${currentTrack.genre}` : 'Simple audio test - click play button'}
              </p>
            </div>
            <div className="flex items-center gap-2 lg:gap-3">
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
                  // Pause icon from Figma design
                  <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 2.5C3.89543 2.5 3 3.39543 3 4.5V16.5C3 17.6046 3.89543 18.5 5 18.5H7C8.10457 18.5 9 17.6046 9 16.5V4.5C9 3.39543 8.10457 2.5 7 2.5H5ZM13 2.5C11.8954 2.5 11 3.39543 11 4.5V16.5C11 17.6046 11.8954 18.5 13 18.5H15C16.1046 18.5 17 17.6046 17 16.5V4.5C17 3.39543 16.1046 2.5 15 2.5H13Z" fill="#FF8B7E"/>
                  </svg>
                ) : (
                  // Play icon from Figma design
                  <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.2221 9.18458C18.2586 9.75438 18.2586 11.2437 17.2221 11.8135L7.22259 17.3105C6.22292 17.86 5 17.1367 5 15.996L5 5.00214C5 3.86137 6.22292 3.13812 7.22259 3.68766L17.2221 9.18458Z" fill="#FF8B7E"/>
                  </svg>
                )}
              </button>

              <button
                className="p-1 lg:p-2 transition-all duration-200 hover:scale-105"
                onClick={playNextTrack}
              >
                {/* Next button from Figma design */}
                <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.99976 4.75211C2.99976 3.75186 4.11618 3.15676 4.94659 3.71436L13.4458 9.42144C14.1803 9.91464 14.1841 10.9938 13.453 11.4921L4.95375 17.285C4.12398 17.8505 2.99976 17.2562 2.99976 16.2521V4.75211ZM17 4C17 3.72386 16.7761 3.5 16.5 3.5C16.2238 3.5 16 3.72386 16 4V17C16 17.2761 16.2238 17.5 16.5 17.5C16.7761 17.5 17 17.2761 17 17V4Z" fill="#FFA680"/>
                </svg>
              </button>

              <button
                className="p-1 lg:p-2 transition-all duration-200 hover:scale-105"
                onClick={toggleFavorite}
              >
                {/* Heart button from Figma design - shows filled when favorited */}
                {isFavorited ? (
                  <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.38843 4.78963C7.69278 3.07693 4.94954 3.0686 3.26122 4.7739C1.5729 6.4792 1.58114 9.25004 3.27679 10.9627L9.55368 17.3028C9.81404 17.5657 10.2362 17.5657 10.4965 17.3028L16.7408 10.9994C18.4252 9.28856 18.4199 6.52549 16.7239 4.81249C15.0252 3.09671 12.2807 3.08838 10.5894 4.79673L9.99299 5.40026L9.38843 4.78963Z" fill="#FF8B7E"/>
                  </svg>
                ) : (
                  <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.38843 4.78963C7.69278 3.07693 4.94954 3.0686 3.26122 4.7739C1.5729 6.4792 1.58114 9.25004 3.27679 10.9627L9.55368 17.3028C9.81404 17.5657 10.2362 17.5657 10.4965 17.3028L16.7408 10.9994C18.4252 9.28856 18.4199 6.52549 16.7239 4.81249C15.0252 3.09671 12.2807 3.08838 10.5894 4.79673L9.99299 5.40026L9.38843 4.78963Z" fill="#FFDCDC" fillOpacity="0.8"/>
                  </svg>
                )}
              </button>
            </div>
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
          <Link
            to="/ai-chatbot"
            className="flex items-center justify-center gap-2 bg-emotion-mouth text-white text-xs font-medium py-2 px-3 rounded-md border border-emotion-face lg:text-sm lg:py-3 lg:px-4 hover:scale-105 transition-transform duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
              <path d="M12.5 6C11.9477 6 11.5 6.44772 11.5 7C11.5 7.55228 11.9477 8 12.5 8C13.0523 8 13.5 7.55228 13.5 7C13.5 6.44772 13.0523 6 12.5 6ZM7.5 7C7.5 6.44772 7.94772 6 8.5 6C9.05228 6 9.5 6.44772 9.5 7C9.5 7.55228 9.05228 8 8.5 8C7.94772 8 7.5 7.55228 7.5 7ZM11 3C11 2.72386 10.7761 2.5 10.5 2.5C10.2239 2.5 10 2.72386 10 3V3.5H7C6.17157 3.5 5.5 4.17157 5.5 5V9C5.5 9.82843 6.17157 10.5 7 10.5H14C14.8284 10.5 15.5 9.82843 15.5 9V5C15.5 4.17157 14.8284 3.5 14 3.5H11V3ZM7 4.5H14C14.2761 4.5 14.5 4.72386 14.5 5V9C14.5 9.27614 14.2761 9.5 14 9.5H7C6.72386 9.5 6.5 9.27614 6.5 9V5C6.5 4.72386 6.72386 4.5 7 4.5ZM10.75 18.4984C13.3656 18.4649 14.9449 17.9031 15.8718 17.0574C16.747 16.2588 16.9607 15.2813 16.9947 14.5019H17V13.8124C17 12.8131 16.19 12.0031 15.1907 12.0031H12V12H9V12.0031H5.8093C4.81005 12.0031 4 12.8131 4 13.8124V14.5019H4.00533C4.03931 15.2813 4.25297 16.2588 5.1282 17.0574C6.05506 17.9031 7.63442 18.4649 10.25 18.4984V18.5H10.75V18.4984ZM5.8093 13.0031H15.1907C15.6377 13.0031 16 13.3654 16 13.8124V14.25C16 14.9396 15.8688 15.7064 15.1978 16.3187C14.5103 16.946 13.1605 17.5 10.5 17.5C7.83946 17.5 6.48969 16.946 5.80224 16.3187C5.13123 15.7064 5 14.9396 5 14.25V13.8124C5 13.3654 5.36233 13.0031 5.8093 13.0031Z" fill="white"/>
            </svg>
            AI Chatbot
          </Link>
          
          <Link
            to="/music-selection"
            onClick={refreshPlaylist}
            className="flex-1 flex items-center justify-center gap-2 bg-emotion-orange text-white text-xs font-medium py-2 px-3 rounded-md border border-emotion-face lg:text-sm lg:py-3 lg:px-4 hover:scale-105 transition-transform duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
              <path d="M15.5351 2.72561C16.179 2.52439 16.8334 3.00545 16.8334 3.68009V14C16.8334 15.3807 15.7141 16.5 14.3334 16.5C12.9527 16.5 11.8334 15.3807 11.8334 14C11.8334 12.6193 12.9527 11.5 14.3334 11.5C14.8962 11.5 15.4155 11.686 15.8334 11.9998V6.68009L8.83337 8.8676V16C8.83337 17.3807 7.71409 18.5 6.33337 18.5C4.95266 18.5 3.83337 17.3807 3.83337 16C3.83337 14.6193 4.95266 13.5 6.33337 13.5C6.89618 13.5 7.41554 13.686 7.83337 13.9998V5.86759C7.83337 5.43021 8.11762 5.04358 8.5351 4.91311L15.5351 2.72561ZM8.83337 7.8199L15.8334 5.6324V3.68009L8.83337 5.86759V7.8199ZM6.33337 14.5C5.50495 14.5 4.83337 15.1716 4.83337 16C4.83337 16.8284 5.50495 17.5 6.33337 17.5C7.1618 17.5 7.83337 16.8284 7.83337 16C7.83337 15.1716 7.1618 14.5 6.33337 14.5ZM12.8334 14C12.8334 14.8284 13.5049 15.5 14.3334 15.5C15.1618 15.5 15.8334 14.8284 15.8334 14C15.8334 13.1716 15.1618 12.5 14.3334 12.5C13.5049 12.5 12.8334 13.1716 12.8334 14Z" fill="white"/>
            </svg>
            Select Music
          </Link>
          
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
    </div>
  );
};

export default EmoCopilotDashboard;
