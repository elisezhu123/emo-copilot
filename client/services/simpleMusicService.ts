import { Track } from './musicService';
import { freesoundService } from './freesoundServiceNew';

// Simple music service using improved Freesound API with CORS handling
class SimpleMusicService {
  private static instance: SimpleMusicService;
  private cachedTracks: Track[] = [];
  private isLoading: boolean = false;
  private lastGenres: string[] = [];
  private cacheTimeout: NodeJS.Timeout | null = null;

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

  // Fallback tracks if Freesound fails - expanded for better UX
  private getFallbackTracks(): Track[] {
    return [
      // Classical
      { id: 'fallback_classical_1', title: 'Piano Sonata', artist: 'Classical Demo', duration: 180, genre: 'Classical', url: 'https://www.w3schools.com/html/horse.mp3' },
      { id: 'fallback_classical_2', title: 'String Quartet', artist: 'Orchestra Demo', duration: 200, genre: 'Classical', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },

      // Jazz
      { id: 'fallback_jazz_1', title: 'Smooth Jazz', artist: 'Jazz Demo', duration: 240, genre: 'Jazz', url: 'https://www.w3schools.com/html/horse.mp3' },
      { id: 'fallback_jazz_2', title: 'Blue Note', artist: 'Jazz Collective Demo', duration: 220, genre: 'Jazz', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },

      // Folk
      { id: 'fallback_folk_1', title: 'Mountain Song', artist: 'Folk Demo', duration: 190, genre: 'Folk', url: 'https://www.w3schools.com/html/horse.mp3' },
      { id: 'fallback_folk_2', title: 'Acoustic Tales', artist: 'Folk Heritage Demo', duration: 210, genre: 'Folk', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },

      // Ambient
      { id: 'fallback_ambient_1', title: 'Peaceful Soundscape', artist: 'Ambient Demo', duration: 300, genre: 'Ambient', url: 'https://www.w3schools.com/html/horse.mp3' },
      { id: 'fallback_ambient_2', title: 'Ethereal Drift', artist: 'Ambient Collective Demo', duration: 280, genre: 'Ambient', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },

      // Rock
      { id: 'fallback_rock_1', title: 'Electric Power', artist: 'Rock Demo', duration: 200, genre: 'Rock', url: 'https://www.w3schools.com/html/horse.mp3' },
      { id: 'fallback_rock_2', title: 'Guitar Anthem', artist: 'Rock Band Demo', duration: 190, genre: 'Rock', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' }
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

  // Smart reload - only reload if genres changed or cache is old
  async forceFreshReload(genres: string[]): Promise<void> {
    const genresChanged = JSON.stringify(genres.sort()) !== JSON.stringify(this.lastGenres.sort());

    if (genresChanged) {
      console.log('🔄 Genres changed, loading new tracks');
      this.cachedTracks = [];
      await this.updateGenres(genres);
    } else if (this.cachedTracks.length > 0) {
      console.log('⚡ Using cached tracks for same genres (faster loading)');
      return; // Use existing cache for better performance
    } else {
      console.log('🔄 No cache available, loading tracks');
      await this.updateGenres(genres);
    }
  }

  // Smart cache clearing
  clearCache(): void {
    console.log('🧹 Clearing music cache');
    this.cachedTracks = [];
    this.lastGenres = [];
    if (this.cacheTimeout) {
      clearTimeout(this.cacheTimeout);
      this.cacheTimeout = null;
    }
  }

  // Check if currently loading
  isCurrentlyLoading(): boolean {
    return this.isLoading;
  }

  // Optimized genre update with smart caching and loading states
  async updateGenres(genres: string[]): Promise<void> {
    // Prevent concurrent loading
    if (this.isLoading) {
      console.log('⚡ Already loading, skipping duplicate request');
      return;
    }

    this.isLoading = true;
    this.lastGenres = [...genres];

    try {
      console.log('⚡ Fast loading from Freesound API for genres:', genres);

      // Clear any existing cache timeout
      if (this.cacheTimeout) {
        clearTimeout(this.cacheTimeout);
      }

      // Load tracks with optimized parallel processing
      const freshTracks = await freesoundService.getTracksByGenres(genres);

      // Simple ID assignment for better performance
      this.cachedTracks = freshTracks.map((track, index) => ({
        ...track,
        id: `${track.id}_${index}` // Simple unique ID
      }));

      console.log(`⚡ Fast loaded ${this.cachedTracks.length} tracks`);

      // Set cache timeout (5 minutes) for automatic refresh
      this.cacheTimeout = setTimeout(() => {
        console.log('🔄 Cache expired, will reload on next request');
        this.cachedTracks = [];
      }, 5 * 60 * 1000);

      // Log sample without URLs for better performance
      if (this.cachedTracks.length > 0) {
        console.log('⚡ Sample tracks loaded:');
        this.cachedTracks.slice(0, 2).forEach(track => {
          console.log(`   - "${track.title}" by ${track.artist} (${track.genre})`);
        });
      }

    } catch (error) {
      console.error('❌ Fast loading failed:', error);
      // Use fallback without retry for better UX
      this.cachedTracks = this.getFallbackTracks().filter(track =>
        genres.some(genre => track.genre.toLowerCase() === genre.toLowerCase())
      );
      console.log(`🔄 Using ${this.cachedTracks.length} fallback tracks`);
    } finally {
      this.isLoading = false;
    }
  }

  // Get tracks for current selected genres
  getSelectedGenreTracks(): Track[] {
    return this.cachedTracks;
  }
}

export const simpleMusicService = SimpleMusicService.getInstance();
