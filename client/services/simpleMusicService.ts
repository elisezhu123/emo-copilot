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
    console.log('🎵 SimpleMusicService initialized');
    this.cachedTracks = [];
  }

  // REMOVED: All fallback tracks - only using Freesound API now

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

    // Shuffle tracks to ensure random order every time
    const shuffledTracks = this.shuffleArray([...this.cachedTracks]);
    console.log('🔀 Randomized track order to avoid repetition');
    return shuffledTracks;
  }

  // Fisher-Yates shuffle algorithm for true randomization
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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

  // Smart reload with optional force refresh - allows continuous updates
  async forceFreshReload(genres: string[], forceRefresh: boolean = false): Promise<void> {
    console.log('🔍 SimpleMusicService: forceFreshReload called with genres:', genres);
    console.log('🔍 SimpleMusicService: forceRefresh:', forceRefresh);
    console.log('🔍 SimpleMusicService: lastGenres:', this.lastGenres);
    console.log('🔍 SimpleMusicService: cached tracks count:', this.cachedTracks.length);

    const genresChanged = JSON.stringify(genres.sort()) !== JSON.stringify(this.lastGenres.sort());
    console.log('🔍 SimpleMusicService: genres changed?', genresChanged);

    // Force refresh bypasses all cache logic
    if (forceRefresh) {
      console.log('🔄 Force refresh requested - clearing cache and loading fresh tracks');
      this.cachedTracks = [];
      this.clearCache();
      await this.updateGenres(genres);
      return;
    }

    if (genresChanged) {
      console.log('🔄 Genres changed, clearing cache and loading new tracks');
      this.cachedTracks = [];
      this.clearCache(); // Ensure complete cache clear
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
      console.log('⚡ Loading tracks for genres:', genres);

      // Clear any existing cache timeout
      if (this.cacheTimeout) {
        clearTimeout(this.cacheTimeout);
      }

      // Load tracks with optimized parallel processing
      let freshTracks = await freesoundService.getTracksByGenres(genres);

      // If no tracks from API, use fallback tracks
      if (!freshTracks || freshTracks.length === 0) {
        console.log('🎵 No tracks from Freesound API, using fallback tracks for Classical...');
        freshTracks = [
          {
            id: 'classical_fallback_1',
            title: 'Moonlight Sonata',
            artist: 'Classical Piano',
            duration: 180,
            genre: 'Classical',
            url: 'https://archive.org/download/MoonlightSonata_755/Moonlight%20Sonata.mp3'
          },
          {
            id: 'classical_fallback_2',
            title: 'Canon in D',
            artist: 'Baroque Ensemble',
            duration: 240,
            genre: 'Classical',
            url: 'https://archive.org/download/PachelbelCanonInD/canon.mp3'
          },
          {
            id: 'classical_fallback_3',
            title: 'Für Elise',
            artist: 'Piano Classic',
            duration: 200,
            genre: 'Classical',
            url: 'https://archive.org/download/FurElise_201805/Fur%20Elise.mp3'
          }
        ].filter(track =>
          genres.some(genre =>
            track.genre.toLowerCase() === genre.toLowerCase()
          )
        );
      }

      // Simple ID assignment for better performance
      this.cachedTracks = freshTracks.map((track, index) => ({
        ...track,
        id: `${track.id}_${index}` // Simple unique ID
      }));

      console.log(`⚡ Loaded ${this.cachedTracks.length} tracks for genres: ${genres.join(', ')}`);

      // Log genre distribution for multiple genre selections
      if (genres.length > 1) {
        console.log('🎼 Multi-genre track distribution:');
        genres.forEach(genre => {
          const genreTracks = this.cachedTracks.filter(track => track.genre.toLowerCase() === genre.toLowerCase());
          console.log(`   - ${genre}: ${genreTracks.length} tracks`);
          if (genreTracks.length > 0) {
            console.log(`     Sample: "${genreTracks[0].title}" by ${genreTracks[0].artist}`);
          }
        });
      }

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
      console.error('❌ Freesound API loading failed:', error);
      console.log('🎵 Using fallback tracks for better user experience');

      // Use fallback tracks filtered by requested genres
      const fallbackTracks = [
        // Classical fallback tracks
        {
          id: 'classical_fallback_1',
          title: 'Demo Classical Track',
          artist: 'Demo Artist',
          duration: 30,
          genre: 'Classical',
          url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBzWL0fPTgCwGKn3G7NyOOwgURrnn1qU='
        },
        {
          id: 'jazz_fallback_1',
          title: 'Demo Jazz Track',
          artist: 'Demo Artist',
          duration: 30,
          genre: 'Jazz',
          url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBzWL0fPTgCwGKn3G7NyOOwgURrnn1qU='
        },
        {
          id: 'ambient_fallback_1',
          title: 'Demo Ambient Track',
          artist: 'Demo Artist',
          duration: 30,
          genre: 'Ambient',
          url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBzWL0fPTgCwGKn3G7NyOOwgURrnn1qU='
        },
        {
          id: 'rock_fallback_1',
          title: 'Demo Rock Track',
          artist: 'Demo Artist',
          duration: 30,
          genre: 'Rock',
          url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBzWL0fPTgCwGKn3G7NyOOwgURrnn1qU='
        }
      ].filter(track =>
        genres.some(genre =>
          track.genre.toLowerCase() === genre.toLowerCase()
        )
      );

      this.cachedTracks = fallbackTracks;
      console.log(`🎵 Using ${fallbackTracks.length} fallback tracks for genres: ${genres.join(', ')}`);
    } finally {
      this.isLoading = false;
    }
  }

  // Get tracks for current selected genres
  getSelectedGenreTracks(): Track[] {
    return this.cachedTracks;
  }

  // Force clear cache and reload fresh tracks
  async forceReload(genres: string[]): Promise<void> {
    console.log('🔄 Force reload requested for genres:', genres);
    await this.forceFreshReload(genres, true);
  }
}

export const simpleMusicService = SimpleMusicService.getInstance();
