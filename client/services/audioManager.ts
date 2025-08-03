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
    // Remove CORS restriction to allow Freesound URLs
    // this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'metadata';

    console.log('🎵 Audio element initialized');

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
    this.notifyListeners();
    // You can implement auto-next functionality here
  }

  private onError(error: Event) {
    console.error('❌ Audio error event:', error);
    console.error('❌ Audio element error details:', {
      error: this.audio?.error,
      code: this.audio?.error?.code,
      message: this.audio?.error?.message,
      networkState: this.audio?.networkState,
      readyState: this.audio?.readyState,
      src: this.audio?.src
    });
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

    const state = {
      isPlaying: !this.audio.paused && !this.audio.ended,
      isPaused: this.audio.paused,
      currentTime: this.audio.currentTime,
      duration: this.audio.duration || 0,
      volume: this.audio.volume,
      isMuted: this.audio.muted,
      isLoading: this.audio.readyState < 3,
      error: this.audio.error ? this.audio.error.message : null
    };

    // Log state changes for debugging
    if (state.error) {
      console.error('🔴 Audio State Error:', state.error);
    }

    return state;
  }

  // Load and play a track
  async playTrack(track: Track): Promise<void> {
    if (!this.audio) return;

    try {
      this.currentTrack = track;

      // Set audio source with fallback URLs
      const audioUrl = track.url || this.getFallbackAudioUrl();
      this.audio.src = audioUrl;

      console.log('Loading track:', track.title, 'from URL:', audioUrl);

      // Wait for audio to load
      await this.waitForLoad();

      // Start playing
      await this.audio.play();

      console.log('✅ Now playing:', track.title, 'by', track.artist);

    } catch (error) {
      console.error('❌ Error playing track:', error);
      // Try with fallback URL if main URL fails
      await this.tryFallbackAudio(track);
    }
  }

  // Get a reliable fallback audio URL
  private getFallbackAudioUrl(): string {
    // These are known working audio URLs for demonstration
    const fallbackUrls = [
      'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
      'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav',
      'https://www2.cs.uic.edu/~i101/SoundFiles/ImperialMarch60.wav',
      'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
    ];
    return fallbackUrls[Math.floor(Math.random() * fallbackUrls.length)];
  }

  // Try fallback audio if primary URL fails
  private async tryFallbackAudio(track: Track): Promise<void> {
    if (!this.audio) return;

    try {
      // Use a very simple, known working audio URL for testing
      const testUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEUCjyRzfPBeCkCKYPH8diNOwhZsEd+ynZtNcbvFZdXN3Qnpgj7TGqKjQf3lEkxhBrGMl4SQCX+SqO0MKtMcUKnCbpLnoqzpQj8KXEOm9Z2Qz0c4lM3yq5WMKcJJ1hxf6TKTXpgpzLKcYzm1t7dq2JEg0g9UcN6PnuQqJD5LDXiSAGZ2/rJaKA3F8ZrVqRp4QhkSsJgHlKJggzLFZnY5XtKDzL8k0VNyKV2WRrDLVq5IWNVNCo5bQhvGGHyZVEAJJYjqDi7hWnNc3F9IIcHh2d7XqZcjcY2AQAPAAAAgJT2';

      console.log('🔄 Trying simple test audio...');

      this.audio.src = testUrl;

      // Don't wait for load for data URL
      await this.audio.play();

      console.log('✅ Test audio playing for:', track.title);

    } catch (fallbackError) {
      console.error('❌ Even test audio failed:', fallbackError);
      this.notifyListeners();
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
        console.log('⚠️ Audio loading timeout, proceeding anyway');
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
    if (!this.audio) return;

    try {
      console.log('🎵 Attempting to play audio...');
      console.log('🎵 Audio state before play:', {
        src: this.audio.src,
        readyState: this.audio.readyState,
        paused: this.audio.paused,
        duration: this.audio.duration
      });

      await this.audio.play();
      console.log('✅ Audio playing successfully');
    } catch (error) {
      console.error('❌ Error playing audio:', error);

      // Handle common play() rejection reasons
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            console.error('❌ Audio blocked - user interaction required');
            break;
          case 'NotSupportedError':
            console.error('❌ Audio format not supported');
            break;
          case 'AbortError':
            console.error('❌ Audio loading aborted');
            break;
          default:
            console.error('❌ Unknown audio error:', error.name, error.message);
        }
      }
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
