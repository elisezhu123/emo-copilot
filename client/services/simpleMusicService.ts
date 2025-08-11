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

  // Update genres and refresh music collection
  async updateGenres(genres: string[]): Promise<void> {
    try {
      console.log('🎵 Loading music for selected genres:', genres);

      // Get tracks for all selected genres
      this.cachedTracks = await freesoundService.getTracksByGenres(genres);

      console.log(`✅ Updated with ${this.cachedTracks.length} tracks for genres:`, genres);

      // If no tracks found, ensure we have at least some fallback tracks
      if (this.cachedTracks.length === 0) {
        console.log('🎵 No tracks found, initializing with fallback tracks');
        await this.initialize();
      }
    } catch (error) {
      console.error('❌ Error updating music for genres:', error);
      // Initialize with fallback tracks if update fails
      await this.initialize();
    }
  }

  // Get tracks for current selected genres
  getSelectedGenreTracks(): Track[] {
    return this.cachedTracks;
  }
}

export const simpleMusicService = SimpleMusicService.getInstance();
