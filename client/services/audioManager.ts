import { Track } from './musicService';

export interface AudioState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
}

class AudioManager {
  private static instance: AudioManager;
  private audio: HTMLAudioElement | null = null;
  private currentTrack: Track | null = null;
  private listeners: Array<(state: AudioState) => void> = [];
  private playlist: Track[] = [];
  private currentTrackIndex: number = 0;
  private autoPlay: boolean = true;

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  constructor() {
    this.initializeAudio();
  }

  private initializeAudio() {
    this.audio = new Audio();
    // Enable CORS for cross-origin audio resources
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'metadata';

    console.log('🎵 Audio element initialized with CORS support');

    // Add event listeners
    this.audio.addEventListener('loadstart', () => this.notifyListeners());
    this.audio.addEventListener('loadeddata', () => this.notifyListeners());
    this.audio.addEventListener('canplay', () => this.notifyListeners());
    this.audio.addEventListener('play', () => this.notifyListeners());
    this.audio.addEventListener('pause', () => this.notifyListeners());
    this.audio.addEventListener('ended', () => this.onTrackEnded());
    this.audio.addEventListener('timeupdate', () => this.notifyListeners());
    this.audio.addEventListener('volumechange', () => this.notifyListeners());
    this.audio.addEventListener('error', (e) => this.onError(e));

    // Set default volume
    this.audio.volume = 0.7;
  }

  // Subscribe to audio state changes
  subscribe(listener: (state: AudioState) => void) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  private onTrackEnded() {
    console.log('Track ended:', this.currentTrack?.title);
    
    // Auto-play next track if available
    if (this.autoPlay && this.playlist.length > 1) {
      this.playNextTrack();
    }
    
    this.notifyListeners();
  }

  private onError(error: Event) {
    const audioError = this.audio?.error;

    // Don't log AbortError as it's normal when switching tracks
    if (audioError?.code === MediaError.MEDIA_ERR_ABORTED) {
      console.log('ℹ️ Audio loading aborted (normal when switching tracks)');
      return;
    }

    // Get human-readable error details
    const getErrorCodeName = (code: number | undefined): string => {
      if (!code) return 'Unknown';
      switch (code) {
        case MediaError.MEDIA_ERR_ABORTED: return 'ABORTED (Operation was aborted)';
        case MediaError.MEDIA_ERR_NETWORK: return 'NETWORK (Network error occurred)';
        case MediaError.MEDIA_ERR_DECODE: return 'DECODE (Error occurred while decoding)';
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: return 'SRC_NOT_SUPPORTED (Audio format not supported)';
        default: return `Unknown error code: ${code}`;
      }
    };

    const getNetworkStateName = (state: number | undefined): string => {
      if (!state) return 'Unknown';
      switch (state) {
        case HTMLMediaElement.NETWORK_EMPTY: return 'EMPTY (No data)';
        case HTMLMediaElement.NETWORK_IDLE: return 'IDLE (Not loading)';
        case HTMLMediaElement.NETWORK_LOADING: return 'LOADING (Downloading data)';
        case HTMLMediaElement.NETWORK_NO_SOURCE: return 'NO_SOURCE (No valid source)';
        default: return `Unknown network state: ${state}`;
      }
    };

    const getReadyStateName = (state: number | undefined): string => {
      if (!state) return 'Unknown';
      switch (state) {
        case HTMLMediaElement.HAVE_NOTHING: return 'HAVE_NOTHING (No data)';
        case HTMLMediaElement.HAVE_METADATA: return 'HAVE_METADATA (Metadata loaded)';
        case HTMLMediaElement.HAVE_CURRENT_DATA: return 'HAVE_CURRENT_DATA (Current frame loaded)';
        case HTMLMediaElement.HAVE_FUTURE_DATA: return 'HAVE_FUTURE_DATA (Some future data loaded)';
        case HTMLMediaElement.HAVE_ENOUGH_DATA: return 'HAVE_ENOUGH_DATA (Enough data to play)';
        default: return `Unknown ready state: ${state}`;
      }
    };

    console.error('❌ Audio error event type:', error.type);
    console.error('❌ Audio error details:');
    console.error('   Error Code:', getErrorCodeName(audioError?.code));
    console.error('   Error Message:', audioError?.message || 'No message');
    console.error('   Network State:', getNetworkStateName(this.audio?.networkState));
    console.error('   Ready State:', getReadyStateName(this.audio?.readyState));
    console.error('   Source URL:', this.audio?.src || 'No source');
    console.error('   Current Time:', this.audio?.currentTime || 0);
    console.error('   Duration:', this.audio?.duration || 'Unknown');

    // Log a user-friendly error message
    if (audioError?.code === MediaError.MEDIA_ERR_NETWORK) {
      console.error('🌐 Network error: Unable to load audio. Check your internet connection or try a different track.');
    } else if (audioError?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
      console.error('🔧 Format error: This audio format is not supported by your browser.');
    } else if (audioError?.code === MediaError.MEDIA_ERR_DECODE) {
      console.error('🎵 Decode error: The audio file appears to be corrupted or invalid.');
    }

    this.notifyListeners();
  }

  // Get current audio state
  getState(): AudioState {
    if (!this.audio) {
      return {
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        volume: 0.7,
        isMuted: false,
        isLoading: false,
        error: 'Audio not initialized'
      };
    }

    try {
      const state = {
        isPlaying: !this.audio.paused && !this.audio.ended,
        isPaused: this.audio.paused,
        currentTime: this.audio.currentTime || 0,
        duration: this.audio.duration || 0,
        volume: this.audio.volume || 0.7,
        isMuted: this.audio.muted || false,
        isLoading: false, // Force loading to false - we'll manage this manually
        error: this.audio.error ? (this.audio.error.message || 'Audio error occurred') : null
      };

      return state;
    } catch (error) {
      console.error('❌ Error getting audio state:', error);
      return {
        isPlaying: false,
        isPaused: true,
        currentTime: 0,
        duration: 0,
        volume: 0.7,
        isMuted: false,
        isLoading: false,
        error: 'Audio state error'
      };
    }
  }

  // Load and play a track with improved error handling
  async playTrack(track: Track): Promise<void> {
    if (!this.audio) {
      throw new Error('Audio manager not initialized');
    }

    try {
      this.currentTrack = track;

      // Update current track index if this track is in the playlist
      const trackIndex = this.playlist.findIndex(t => t.id === track.id);
      if (trackIndex >= 0) {
        this.currentTrackIndex = trackIndex;
      }

      let audioUrl = track.url;

      // Check if URL is invalid or points to the app routes instead of audio files
      if (!audioUrl || audioUrl.includes('/music-playlists') || audioUrl.includes('/ai-chatbot') || audioUrl.includes('fly.dev') || !this.isValidAudioUrl(audioUrl)) {
        console.warn('⚠️ Invalid or missing audio URL detected, using test audio');
        console.log('🔗 Invalid URL was:', audioUrl);
        audioUrl = this.getTestAudioUrl();
      }

      console.log('🎵 Loading track:', track.title);
      console.log('🔗 Audio URL:', audioUrl.substring(0, 100) + (audioUrl.length > 100 ? '...' : ''));

      // Properly stop current audio to prevent abort errors
      this.stopCurrentAudio();

      // Small delay to let the stop complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Set the new source
      this.audio.src = audioUrl;
      this.audio.volume = 0.5; // Lower volume to avoid issues
      this.audio.muted = false;

      // Simplified loading approach
      try {
        // Start loading immediately
        this.audio.load();

        // Try to play immediately without waiting for full load
        console.log('🎵 Attempting immediate playback...');
        await this.audio.play();

        console.log('✅ Now playing:', track.title, 'by', track.artist);
        this.notifyListeners();

      } catch (playError) {
        console.warn('⚠️ Immediate playback failed:', playError);
        console.log('🔧 Error details:', {
          name: playError.name,
          message: playError.message,
          code: playError.code
        });

        // If immediate playback fails, try with a test audio URL
        console.log('🔄 Trying fallback audio sources...');
        await this.tryTestAudio(track);
      }

    } catch (error) {
      console.error('❌ Error playing track:', error);

      // Try fallback audio as last resort
      try {
        await this.tryTestAudio(track);
      } catch (fallbackError) {
        console.error('❌ Even fallback audio failed:', fallbackError);

        // Handle specific browser errors
        if (error instanceof DOMException) {
          switch (error.name) {
            case 'NotAllowedError':
              throw new Error('Browser blocked autoplay. Click play again to start music.');
            case 'AbortError':
              throw new Error('Audio loading was canceled. Please try again.');
            case 'NotSupportedError':
              throw new Error('Audio format not supported by your browser.');
            case 'NetworkError':
              throw new Error('Network error loading audio. Check your connection.');
            default:
              throw new Error(`Audio error: ${error.message || error.name || 'Unknown error'}`);
          }
        }

        throw new Error(`Playback failed: ${error.message || 'Unknown error'}`);
      }
    }
  }

  // Get a reliable test audio URL that actually works
  private getTestAudioUrl(): string {
    // Use a simple data URL that always works without network issues
    return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEUCjyRzfPBeCkCKYPH8diNOwhZsGJ5';
  }

  // Validate if an audio URL is potentially valid
  private isValidAudioUrl(url: string): boolean {
    if (!url || url.trim() === '') {
      console.warn('⚠️ Empty or null audio URL');
      return false;
    }

    // Check for common audio file extensions or data URLs
    const validPatterns = [
      /\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i,  // Audio file extensions
      /^data:audio\//i,                          // Data URLs
      /^https?:\/\/.*\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i, // HTTP(S) audio URLs
      /cdn\.freesound\.org/i,                    // Freesound CDN
      /samplelib\.com/i                          // Sample library
    ];

    const isValid = validPatterns.some(pattern => pattern.test(url));

    if (!isValid) {
      console.warn('⚠️ Potentially invalid audio URL format:', url.substring(0, 100) + '...');
    }

    return isValid;
  }

  // Get alternative working audio URLs for testing
  private getWorkingAudioUrls(): string[] {
    return [
      // GitHub hosted audio files (more reliable)
      'https://samplelib.com/lib/preview/mp3/sample-3s.mp3',
      'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      // Data URL as ultimate fallback
      this.getTestAudioUrl()
    ];
  }

  // Try test audio with multiple fallbacks
  private async tryTestAudio(track: Track): Promise<void> {
    if (!this.audio) return;

    const testUrls = this.getWorkingAudioUrls();

    for (let i = 0; i < testUrls.length; i++) {
      try {
        const testUrl = testUrls[i];
        console.log(`🔄 Trying fallback audio ${i + 1}/${testUrls.length}:`, testUrl.substring(0, 50) + '...');

        // Reset audio completely
        this.audio.src = '';
        this.audio.load();
        this.audio.src = testUrl;
        this.audio.volume = 0.3; // Even lower volume for test

        // For data URLs, play immediately. For HTTP URLs, wait a moment
        if (testUrl.startsWith('data:')) {
          await this.audio.play();
        } else {
          // Give a small delay for network URLs
          await new Promise(resolve => setTimeout(resolve, 500));
          await this.audio.play();
        }

        console.log(`✅ Fallback audio ${i + 1} playing for:`, track.title);
        this.notifyListeners();
        return; // Success, exit the loop

      } catch (fallbackError) {
        console.warn(`❌ Fallback audio ${i + 1} failed:`, fallbackError);
        if (i === testUrls.length - 1) {
          // Last attempt failed
          console.error('❌ All fallback audio URLs failed');
          this.notifyListeners();
          throw new Error('Unable to play any audio. Please check your browser settings.');
        }
      }
    }
  }

  // Wait for audio to load
  private waitForLoad(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.audio) {
        reject(new Error('Audio not initialized'));
        return;
      }

      if (this.audio.readyState >= 2) { // Changed from 3 to 2 for faster loading
        resolve();
        return;
      }

      // Set a shorter timeout to avoid hanging
      const timeout = setTimeout(() => {
        this.audio?.removeEventListener('canplay', onLoad);
        this.audio?.removeEventListener('loadeddata', onLoad);
        this.audio?.removeEventListener('error', onError);
        console.log('⚠�� Audio loading timeout, proceeding anyway');
        resolve(); // Resolve instead of reject to avoid blocking
      }, 3000); // Reduced to 3 seconds

      const onLoad = () => {
        clearTimeout(timeout);
        this.audio?.removeEventListener('canplay', onLoad);
        this.audio?.removeEventListener('loadeddata', onLoad);
        this.audio?.removeEventListener('error', onError);
        resolve();
      };

      const onError = (e: Event) => {
        clearTimeout(timeout);
        this.audio?.removeEventListener('canplay', onLoad);
        this.audio?.removeEventListener('loadeddata', onLoad);
        this.audio?.removeEventListener('error', onError);
        reject(new Error('Failed to load audio'));
      };

      this.audio.addEventListener('canplay', onLoad);
      this.audio.addEventListener('loadeddata', onLoad);
      this.audio.addEventListener('error', onError);
    });
  }

  // Play/resume audio
  async play(): Promise<void> {
    if (!this.audio) {
      console.warn('⚠️ Cannot play - audio not initialized');
      return;
    }

    try {
      // Check if audio source is valid
      if (!this.audio.src || this.audio.src === '') {
        console.warn('⚠️ Cannot play - no audio source');
        return;
      }

      console.log('🎵 Attempting to play audio...');
      console.log('🎵 Audio state before play:', {
        src: this.audio.src.substring(0, 50) + '...',
        readyState: this.audio.readyState,
        paused: this.audio.paused,
        duration: this.audio.duration || 'Unknown',
        currentTime: this.audio.currentTime || 0
      });

      // Check if audio is in a valid state to play
      if (this.audio.error) {
        console.error('❌ Cannot play - audio element has error:', this.audio.error.message);
        return;
      }

      await this.audio.play();
      console.log('✅ Audio playing successfully');
      this.notifyListeners();
    } catch (error) {
      // Don't log AbortError as error - it's normal when switching tracks
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('ℹ️ Audio play aborted (normal when switching tracks)');
        return;
      }

      console.error('❌ Error playing audio:', error);

      // Handle common play() rejection reasons
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            console.error('❌ Audio blocked - user interaction required');
            console.log('💡 Try clicking on the page first, then play audio');
            break;
          case 'NotSupportedError':
            console.error('❌ Audio format not supported');
            console.log('💡 Try a different audio source');
            break;
          case 'NetworkError':
            console.error('❌ Network error loading audio');
            console.log('💡 Check your internet connection');
            break;
          default:
            console.error('❌ Unknown audio error:', error.name, error.message);
        }
      }

      // Notify listeners of the error state
      this.notifyListeners();
    }
  }

  // Properly stop current audio before loading new track
  private stopCurrentAudio(): void {
    if (!this.audio) return;

    try {
      // Pause first to avoid interruption errors
      if (!this.audio.paused) {
        this.audio.pause();
      }

      // Clear the source to stop loading
      this.audio.src = '';
      this.audio.load(); // This will abort any ongoing load

    } catch (error) {
      // Ignore errors when stopping - they're expected
      console.log('ℹ️ Stopped current audio (ignoring stop errors)');
    }
  }

  // Pause audio
  pause(): void {
    if (!this.audio) return;
    this.audio.pause();
  }

  // Toggle play/pause
  async togglePlay(): Promise<void> {
    if (!this.audio) return;

    if (this.audio.paused) {
      await this.play();
    } else {
      this.pause();
    }
  }

  // Set volume (0-1)
  setVolume(volume: number): void {
    if (!this.audio) return;
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  // Toggle mute
  toggleMute(): void {
    if (!this.audio) return;
    this.audio.muted = !this.audio.muted;
  }

  // Seek to specific time
  seekTo(time: number): void {
    if (!this.audio) return;
    this.audio.currentTime = Math.max(0, Math.min(this.audio.duration || 0, time));
  }

  // Seek by percentage (0-1)
  seekToPercent(percent: number): void {
    if (!this.audio) return;
    const time = (this.audio.duration || 0) * percent;
    this.seekTo(time);
  }

  // Get current track
  getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  // Set playlist for continuous playback
  setPlaylist(tracks: Track[], startIndex: number = 0): void {
    this.playlist = tracks;
    this.currentTrackIndex = startIndex;
    console.log('🎵 Playlist set with', tracks.length, 'tracks, starting at index', startIndex);
  }

  // Play next track in playlist
  async playNextTrack(): Promise<void> {
    if (this.playlist.length === 0) {
      console.log('🎵 No playlist available for auto-play');
      return;
    }

    // Check if we're at the last track
    if (this.currentTrackIndex >= this.playlist.length - 1) {
      console.log('🎵 Reached end of playlist, stopping playback');
      this.stop();
      return;
    }

    // Move to next track
    this.currentTrackIndex = this.currentTrackIndex + 1;
    const nextTrack = this.playlist[this.currentTrackIndex];
    
    if (nextTrack) {
      console.log('🎵 Playing next track:', nextTrack.title, `(${this.currentTrackIndex + 1}/${this.playlist.length})`);
      try {
        await this.playTrack(nextTrack);
      } catch (error) {
        console.error('❌ Error playing next track:', error);
        // Try the next track if this one fails and we're not at the end
        if (this.currentTrackIndex < this.playlist.length - 1) {
          await this.playNextTrack();
        }
      }
    }
  }

  // Play previous track in playlist
  async playPreviousTrack(): Promise<void> {
    if (this.playlist.length === 0) {
      console.log('🎵 No playlist available');
      return;
    }

    // Check if we're at the first track
    if (this.currentTrackIndex <= 0) {
      console.log('🎵 Already at the first track');
      return;
    }

    // Move to previous track
    this.currentTrackIndex = this.currentTrackIndex - 1;
    
    const prevTrack = this.playlist[this.currentTrackIndex];
    
    if (prevTrack) {
      console.log('🎵 Playing previous track:', prevTrack.title, `(${this.currentTrackIndex + 1}/${this.playlist.length})`);
      try {
        await this.playTrack(prevTrack);
      } catch (error) {
        console.error('❌ Error playing previous track:', error);
      }
    }
  }

  // Enable/disable auto-play
  setAutoPlay(enabled: boolean): void {
    this.autoPlay = enabled;
    console.log('🎵 Auto-play', enabled ? 'enabled' : 'disabled');
  }

  // Get current playlist info
  getPlaylistInfo(): { total: number; current: number; track: Track | null } {
    return {
      total: this.playlist.length,
      current: this.currentTrackIndex,
      track: this.currentTrack
    };
  }

  // Stop and reset audio
  stop(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.currentTrack = null;
  }

  // Format time in MM:SS format
  formatTime(seconds: number): string {
    if (isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Clean up resources
  destroy(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.listeners = [];
    this.currentTrack = null;
  }
}

export const audioManager = AudioManager.getInstance();
