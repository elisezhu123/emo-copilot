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

    // Test fallback tracks for Rock/Blues immediately
    const testFallback = this.getFallbackTracks();
    const rockTest = testFallback.filter(track => track.genre.toLowerCase() === 'rock');
    const bluesTest = testFallback.filter(track => track.genre.toLowerCase() === 'blues');
    console.log('🎸 INITIALIZATION TEST: Rock fallback tracks:', rockTest.length);
    console.log('🎸 INITIALIZATION TEST: Blues fallback tracks:', bluesTest.length);
  }

  // Fallback tracks if Freesound fails - complete genre coverage
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
      { id: 'fallback_rock_2', title: 'Guitar Anthem', artist: 'Rock Band Demo', duration: 190, genre: 'Rock', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },

      // Downbeat - ADDED MISSING GENRE
      { id: 'fallback_downbeat_1', title: 'Slow Motion Vibes', artist: 'Trip Hop Demo', duration: 270, genre: 'Downbeat', url: 'https://www.w3schools.com/html/horse.mp3' },
      { id: 'fallback_downbeat_2', title: 'Urban Shadows', artist: 'Downtempo Demo', duration: 250, genre: 'Downbeat', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },
      { id: 'fallback_downbeat_3', title: 'Chill Beats', artist: 'Lofi Demo', duration: 280, genre: 'Downbeat', url: 'https://www.w3schools.com/html/horse.mp3' },

      // Blues
      { id: 'fallback_blues_1', title: 'Midnight Blues', artist: 'Blues Demo', duration: 220, genre: 'Blues', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },
      { id: 'fallback_blues_2', title: 'Delta Sounds', artist: 'Blues Heritage Demo', duration: 240, genre: 'Blues', url: 'https://www.w3schools.com/html/horse.mp3' },

      // Chillout
      { id: 'fallback_chillout_1', title: 'Sunset Lounge', artist: 'Chill Demo', duration: 260, genre: 'Chillout', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },
      { id: 'fallback_chillout_2', title: 'Relaxed Vibes', artist: 'Lounge Demo', duration: 245, genre: 'Chillout', url: 'https://www.w3schools.com/html/horse.mp3' },

      // Country
      { id: 'fallback_country_1', title: 'Country Roads', artist: 'Country Demo', duration: 210, genre: 'Country', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },
      { id: 'fallback_country_2', title: 'Hometown Tale', artist: 'Americana Demo', duration: 195, genre: 'Country', url: 'https://www.w3schools.com/html/horse.mp3' },

      // Hip-Pop
      { id: 'fallback_hip_pop_1', title: 'Urban Beat', artist: 'Hip-Pop Demo', duration: 180, genre: 'Hip-Pop', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },
      { id: 'fallback_hip_pop_2', title: 'City Flow', artist: 'Rap Demo', duration: 165, genre: 'Hip-Pop', url: 'https://www.w3schools.com/html/horse.mp3' },

      // Electro Pop
      { id: 'fallback_electro_pop_1', title: 'Neon Lights', artist: 'Electro Demo', duration: 200, genre: 'Electro Pop', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },
      { id: 'fallback_electro_pop_2', title: 'Digital Dreams', artist: 'Synth Demo', duration: 185, genre: 'Electro Pop', url: 'https://www.w3schools.com/html/horse.mp3' },

      // New Age
      { id: 'fallback_new_age_1', title: 'Crystal Meditation', artist: 'New Age Demo', duration: 300, genre: 'New Age', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3' },
      { id: 'fallback_new_age_2', title: 'Healing Sounds', artist: 'Spiritual Demo', duration: 320, genre: 'New Age', url: 'https://www.w3schools.com/html/horse.mp3' }
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
      console.log('⚡ Fast loading from Freesound API for genres:', genres);

      // Special debug for Rock and Blues
      if (genres.includes('Rock') || genres.includes('Blues')) {
        console.log('🎸 ROCK/BLUES DEBUG (simpleMusicService): Loading Rock or Blues!');
        console.log('🎸 ROCK/BLUES DEBUG (simpleMusicService): All genres:', genres);
        console.log('🎸 ROCK/BLUES DEBUG (simpleMusicService): Has Rock:', genres.includes('Rock'));
        console.log('🎸 ROCK/BLUES DEBUG (simpleMusicService): Has Blues:', genres.includes('Blues'));
      }

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

      console.log(`⚡ Fast loaded ${this.cachedTracks.length} tracks for genres: ${genres.join(', ')}`);

      // Special debug for Rock and Blues track counts
      if (genres.includes('Rock') || genres.includes('Blues')) {
        console.log('🎸 ROCK/BLUES DEBUG (simpleMusicService): Track loading results:');
        console.log('🎸 ROCK/BLUES DEBUG (simpleMusicService): Total tracks loaded:', this.cachedTracks.length);

        const rockTracks = this.cachedTracks.filter(track => track.genre.toLowerCase() === 'rock');
        const bluesTracks = this.cachedTracks.filter(track => track.genre.toLowerCase() === 'blues');

        console.log('🎸 ROCK/BLUES DEBUG (simpleMusicService): Rock tracks found:', rockTracks.length);
        console.log('🎸 ROCK/BLUES DEBUG (simpleMusicService): Blues tracks found:', bluesTracks.length);

        if (rockTracks.length > 0) {
          console.log('🎸 ROCK/BLUES DEBUG (simpleMusicService): First Rock track:', rockTracks[0]);
        }
        if (bluesTracks.length > 0) {
          console.log('🎸 ROCK/BLUES DEBUG (simpleMusicService): First Blues track:', bluesTracks[0]);
        }
      }

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
      console.error('❌ Fast loading failed:', error);
      // Use fallback without retry for better UX
      this.cachedTracks = this.getFallbackTracks().filter(track =>
        genres.some(genre => track.genre.toLowerCase() === genre.toLowerCase())
      );
      console.log(`🔄 Using ${this.cachedTracks.length} fallback tracks for genres: ${genres.join(', ')}`);

      // Special debug for Rock and Blues fallback
      if (genres.includes('Rock') || genres.includes('Blues')) {
        console.log('🎸 ROCK/BLUES DEBUG (fallback): API failed, using fallback tracks');
        console.log('🎸 ROCK/BLUES DEBUG (fallback): Total fallback tracks:', this.cachedTracks.length);

        const rockTracks = this.cachedTracks.filter(track => track.genre.toLowerCase() === 'rock');
        const bluesTracks = this.cachedTracks.filter(track => track.genre.toLowerCase() === 'blues');

        console.log('🎸 ROCK/BLUES DEBUG (fallback): Rock fallback tracks:', rockTracks.length);
        console.log('🎸 ROCK/BLUES DEBUG (fallback): Blues fallback tracks:', bluesTracks.length);

        if (rockTracks.length > 0) {
          console.log('🎸 ROCK/BLUES DEBUG (fallback): First Rock fallback:', rockTracks[0]);
        }
        if (bluesTracks.length > 0) {
          console.log('🎸 ROCK/BLUES DEBUG (fallback): First Blues fallback:', bluesTracks[0]);
        }

        // Also debug the raw fallback tracks before filtering
        const allFallback = this.getFallbackTracks();
        console.log('🎸 ROCK/BLUES DEBUG (fallback): All fallback tracks count:', allFallback.length);
        const allRockFallback = allFallback.filter(track => track.genre.toLowerCase() === 'rock');
        const allBluesFallback = allFallback.filter(track => track.genre.toLowerCase() === 'blues');
        console.log('🎸 ROCK/BLUES DEBUG (fallback): All Rock in fallback:', allRockFallback.length);
        console.log('🎸 ROCK/BLUES DEBUG (fallback): All Blues in fallback:', allBluesFallback.length);
      }

      // Log fallback genre distribution for multiple genre selections
      if (genres.length > 1) {
        console.log('🎼 Fallback multi-genre track distribution:');
        genres.forEach(genre => {
          const genreTracks = this.cachedTracks.filter(track => track.genre.toLowerCase() === genre.toLowerCase());
          console.log(`   - ${genre}: ${genreTracks.length} fallback tracks`);
          if (genreTracks.length > 0) {
            console.log(`     Sample: "${genreTracks[0].title}" by ${genreTracks[0].artist}`);
          }
        });
      }
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
