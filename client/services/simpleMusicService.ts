import { Track } from './musicService';
import { freesoundService } from './freesoundServiceNew';

// Simple music service using improved Freesound API with CORS handling
class SimpleMusicService {
  private static instance: SimpleMusicService;
  private cachedTracks: Track[] = [];

  static getInstance(): SimpleMusicService {
    if (!SimpleMusicService.instance) {
      SimpleMusicService.instance = new SimpleMusicService();
    }
    return SimpleMusicService.instance;
  }

  // Initialize with no tracks by default
  async initialize(): Promise<void> {
    console.log('🎵 SimpleMusicService initialized with no default tracks');
    this.cachedTracks = [];
  }

  // Fallback tracks if Freesound fails
  private getFallbackTracks(): Track[] {
    return [
      {
        id: 'fallback_1',
        title: 'Horse Audio Test',
        artist: 'W3Schools',
        duration: 30,
        genre: 'Demo',
        url: 'https://www.w3schools.com/html/horse.mp3'
      },
      {
        id: 'fallback_2',
        title: 'T-Rex Roar',
        artist: 'Mozilla',
        duration: 10,
        genre: 'Demo',
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3'
      }
    ];
  }

  async getRandomTrack(): Promise<Track> {
    if (this.cachedTracks.length === 0) {
      await this.initialize();
    }
    
    const randomIndex = Math.floor(Math.random() * this.cachedTracks.length);
    return this.cachedTracks[randomIndex];
  }

  async getAllTracks(): Promise<Track[]> {
    if (this.cachedTracks.length === 0) {
      await this.initialize();
    }
    
    return [...this.cachedTracks];
  }

  getTracksByGenre(genre: string): Track[] {
    return this.cachedTracks.filter(track => 
      track.genre.toLowerCase() === genre.toLowerCase()
    );
  }

  // Refresh with new tracks from Freesound
  async refresh(): Promise<void> {
    await this.initialize();
  }

  // Force fresh reload - clears cache and gets completely new tracks
  async forceFreshReload(genres: string[]): Promise<void> {
    console.log('🔄 Force refresh: clearing all caches for fresh dynamic playlist');
    this.cachedTracks = [];
    await this.updateGenres(genres);
  }

  // Clear cache to ensure fresh results
  clearCache(): void {
    console.log('🧹 Clearing music cache for fresh playlist');
    this.cachedTracks = [];
  }

  // Update genres and refresh music collection with dynamic playlists
  async updateGenres(genres: string[]): Promise<void> {
    try {
      console.log('🎲 Loading DYNAMIC music from Freesound API for genres:', genres);

      // Always clear cache first for fresh results every time
      this.cachedTracks = [];

      // Force fresh API call with dynamic randomization
      const freshTracks = await freesoundService.getTracksByGenres(genres);

      // Add timestamp to ensure uniqueness even with same genres
      const timestamp = Date.now();
      this.cachedTracks = freshTracks.map(track => ({
        ...track,
        id: `${track.id}_${timestamp}` // Make IDs unique per session
      }));

      console.log(`✅ Loaded ${this.cachedTracks.length} DYNAMIC tracks from Freesound API`);

      if (this.cachedTracks.length > 0) {
        console.log('🎲 Dynamic playlist sample tracks:');
        this.cachedTracks.slice(0, 3).forEach(track => {
          console.log(`   - "${track.title}" by ${track.artist} (${track.genre})`);
          console.log(`     URL: ${track.url?.substring(0, 50)}...`);
        });
      } else {
        console.warn('⚠️ Freesound API returned no tracks, this should not happen with valid API key');
      }

    } catch (error) {
      console.error('❌ Error loading from Freesound API:', error);
      console.log('🔄 Retrying Freesound API call...');

      // Try once more before giving up
      try {
        const retryTracks = await freesoundService.getTracksByGenres(genres);
        const timestamp = Date.now();
        this.cachedTracks = retryTracks.map(track => ({
          ...track,
          id: `${track.id}_${timestamp}_retry`
        }));
        console.log(`🎵 Retry successful: ${this.cachedTracks.length} tracks loaded`);
      } catch (retryError) {
        console.error('❌ Freesound API retry also failed:', retryError);
        // Only now use fallback
        await this.initialize();
      }
    }
  }

  // Get tracks for current selected genres
  getSelectedGenreTracks(): Track[] {
    return this.cachedTracks;
  }
}

export const simpleMusicService = SimpleMusicService.getInstance();
