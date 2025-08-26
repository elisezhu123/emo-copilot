import { Track } from './musicService';

// Freesound.org API service with CORS and redirect handling
class FreesoundService {
  private static instance: FreesoundService;
  private apiKey: string;
  private baseUrl = 'https://freesound.org/apiv2';

  static getInstance(): FreesoundService {
    if (!FreesoundService.instance) {
      FreesoundService.instance = new FreesoundService();
    }
    return FreesoundService.instance;
  }

  constructor() {
    this.apiKey = import.meta.env.VITE_FREESOUND_API_KEY || '';
    if (this.apiKey) {
      console.log('🎵 Freesound API configured with key:', this.apiKey.substring(0, 10) + '...');
    } else {
      console.warn('⚠️ Freesound API key not found in environment variables');
    }
  }

  isConfigured(): boolean {
    const configured = this.apiKey.length > 0;
    console.log('🎵 Freesound API configured:', configured);

    if (!configured) {
      console.error('❌ Freesound API key missing! Please set VITE_FREESOUND_API_KEY environment variable.');
      console.log('🔧 Visit https://freesound.org/apiv2/apply/ to get an API key');
    }

    return configured;
  }

  // Test API connectivity and key validity
  async testApiConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      console.log('🔍 Testing Freesound API connection...');
      const testParams = new URLSearchParams({
        token: this.apiKey,
        query: 'test',
        page_size: '1',
        fields: 'id,name'
      });

      const response = await fetch(`${this.baseUrl}/search/text/?${testParams}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors'
      });

      if (response.ok) {
        console.log('✅ Freesound API connection successful');
        return true;
      } else {
        console.error('❌ Freesound API test failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Freesound API connection test failed:', error);
      return false;
    }
  }

  // Search for tracks with proper CORS and redirect handling - now with dynamic randomization
  async searchTracks(query: string, filters: any = {}): Promise<Track[]> {
    if (!this.isConfigured()) {
      console.warn('Freesound API key not configured, using fallback tracks');
      return this.shuffleArray(this.getFallbackTracks());
    }

    try {
      // Add randomization for dynamic playlists
      const randomVariations = this.getRandomSearchVariations(query);
      const randomSort = this.getRandomSort();
      const randomPage = this.getRandomPage();

      const musicQuery = randomVariations[Math.floor(Math.random() * randomVariations.length)];

      const params = new URLSearchParams({
        token: this.apiKey,
        query: `${musicQuery} music`,
        page_size: '20', // Increased for more variety
        page: randomPage.toString(),
        fields: 'id,name,username,duration,tags,previews,type,channels,license',
        // Search for music with better filters
        filter: `type:(wav OR mp3) duration:[20.0 TO 180.0] tag:music -tag:loop -tag:sfx -tag:effect`,
        sort: randomSort
      });

      console.log(`🎲 Dynamic Freesound search: query="${musicQuery}", sort="${randomSort}", page=${randomPage}`);

      const response = await fetch(`${this.baseUrl}/search/text/?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });

      if (!response.ok) {
        let errorText = 'Unknown error';
        try {
          errorText = await response.text();
        } catch (textError) {
          console.warn('Could not read error response text:', textError);
          errorText = `HTTP ${response.status} ${response.statusText}`;
        }
        console.error('❌ Freesound API error response:', errorText);
        throw new Error(`Freesound API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Dynamic Freesound search found', data.count, 'total results,', data.results?.length, 'returned');

      if (!data.results || data.results.length === 0) {
        console.warn('❌ No tracks found in Freesound API response');
        console.log('🎵 Query was:', musicQuery);
        return [];
      }

      const convertedTracks = await this.convertToTracks(data.results);
      // Shuffle the results for additional randomness
      const shuffledTracks = this.shuffleArray(convertedTracks);
      console.log('✅ Converted and shuffled', shuffledTracks.length, 'tracks successfully');
      return shuffledTracks;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ Freesound API request timed out');
      } else if (error.message.includes('Failed to fetch')) {
        console.error('❌ Network error connecting to Freesound API - check internet connection');
      } else {
        console.error('❌ Error fetching from Freesound:', error);
      }
      console.log('🔄 Falling back to local tracks due to API error');
      return this.shuffleArray(this.getFallbackTracks());
    }
  }

  // Get direct audio URL without verification for faster loading
  private getDirectAudioUrl(previewUrl: string): string {
    // Skip verification to improve loading speed - return URL directly
    return previewUrl;
  }

  // Convert Freesound data to our Track format with direct URLs
  private async convertToTracks(freesoundTracks: any[], targetGenre?: string): Promise<Track[]> {
    const tracks: Track[] = [];

    for (const track of freesoundTracks) {
      try {
        // Filter out weird sounds and non-music content
        if (!this.isMusicTrack(track)) {
          console.log(`Skipping non-music track: ${track.name}`);
          continue;
        }

        // Get the best quality preview URL
        const previewUrl = track.previews['preview-hq-mp3'] || track.previews['preview-lq-mp3'];

        if (!previewUrl) {
          console.warn(`No preview URL for track ${track.id}`);
          continue;
        }

        // Get the direct audio URL without verification for speed
        const directUrl = this.getDirectAudioUrl(previewUrl);

        tracks.push({
          id: `freesound_${track.id}`,
          title: this.cleanTitle(track.name),
          artist: track.username || 'Freesound User',
          duration: Math.round(track.duration) || 60,
          genre: targetGenre || this.extractGenre(track.tags || []),
          url: directUrl
        });
      } catch (error) {
        console.warn(`Failed to process track ${track.id}:`, error);
        // Skip tracks that fail to process
      }
    }

    return tracks;
  }

  // Check if a track is actually music (not sound effects or weird sounds)
  private isMusicTrack(track: any): boolean {
    const name = track.name.toLowerCase();
    const tags = (track.tags || []).map((tag: string) => tag.toLowerCase());

    // Exclude obvious non-music content
    const excludePatterns = [
      'sfx', 'effect', 'fx', 'sound effect', 'noise', 'voice', 'speech', 'talk',
      'field recording', 'nature', 'animal', 'water', 'wind', 'car', 'engine',
      'machine', 'mechanical', 'industrial', 'explosion', 'gun', 'weapon',
      'footstep', 'door', 'phone', 'ring', 'beep', 'click', 'pop', 'crack',
      'crowd', 'people', 'baby', 'child', 'scream', 'yell', 'cough', 'sneeze'
    ];

    // Check if name or tags contain exclude patterns
    for (const pattern of excludePatterns) {
      if (name.includes(pattern) || tags.some(tag => tag.includes(pattern))) {
        return false;
      }
    }

    // Include tracks with music-related keywords
    const musicPatterns = [
      'music', 'musical', 'song', 'melody', 'harmony', 'rhythm', 'beat',
      'instrumental', 'piano', 'guitar', 'violin', 'drums', 'bass', 'synth',
      'classical', 'jazz', 'electronic', 'ambient', 'folk', 'pop', 'rock',
      'chord', 'scale', 'composition', 'track', 'tune', 'theme'
    ];

    // Check if name or tags contain music patterns
    for (const pattern of musicPatterns) {
      if (name.includes(pattern) || tags.some(tag => tag.includes(pattern))) {
        return true;
      }
    }

    // Duration check - music tracks are usually longer than sound effects
    if (track.duration >= 30 && track.duration <= 300) {
      return true;
    }

    return false;
  }

  // Clean up track titles
  private cleanTitle(name: string): string {
    return name.replace(/\.(wav|mp3|flac|ogg)$/i, '')
               .replace(/[_-]/g, ' ')
               .trim();
  }

  // Extract genre from tags with better music genre detection
  private extractGenre(tags: string[]): string {
    const genreMap = {
      'classical': ['classical', 'symphony', 'orchestra', 'chamber', 'baroque', 'romantic'],
      'jazz': ['jazz', 'swing', 'bebop', 'fusion', 'smooth jazz', 'blues'],
      'electronic': ['electronic', 'edm', 'techno', 'house', 'trance', 'dubstep', 'synth'],
      'ambient': ['ambient', 'atmospheric', 'drone', 'soundscape', 'minimal'],
      'piano': ['piano', 'keyboard', 'keys'],
      'folk': ['folk', 'acoustic', 'country', 'bluegrass'],
      'instrumental': ['instrumental', 'music box', 'harp', 'violin', 'guitar']
    };

    for (const tag of tags) {
      const lowerTag = tag.toLowerCase();
      for (const [genre, keywords] of Object.entries(genreMap)) {
        if (keywords.some(keyword => lowerTag.includes(keyword))) {
          return genre.charAt(0).toUpperCase() + genre.slice(1);
        }
      }
    }

    return 'Instrumental';
  }

  // Fallback tracks when API is not available - genre-specific music tracks
  private getFallbackTracks(): Track[] {
    return [
      // Classical Genre
      {
        id: 'classical_1',
        title: 'Piano Sonata in C',
        artist: 'Classical Ensemble',
        duration: 180,
        genre: 'Classical',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },
      {
        id: 'classical_2',
        title: 'Violin Concerto No. 1',
        artist: 'String Quartet',
        duration: 240,
        genre: 'Classical',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },
      {
        id: 'classical_3',
        title: 'Chamber Music Suite',
        artist: 'Orchestra Prima',
        duration: 200,
        genre: 'Classical',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },

      // Jazz Genre
      {
        id: 'jazz_1',
        title: 'Smooth Evening',
        artist: 'Jazz Collective',
        duration: 270,
        genre: 'Jazz',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },
      {
        id: 'jazz_2',
        title: 'Blue Note Cafe',
        artist: 'Bebop Society',
        duration: 300,
        genre: 'Jazz',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },
      {
        id: 'jazz_3',
        title: 'Midnight Sax',
        artist: 'Free Jazz Group',
        duration: 250,
        genre: 'Jazz',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },

      // Ambient Genre
      {
        id: 'ambient_1',
        title: 'Ocean Waves',
        artist: 'Nature Sounds Collective',
        duration: 300,
        genre: 'Ambient',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },
      {
        id: 'ambient_2',
        title: 'Forest Dawn',
        artist: 'Peaceful Minds',
        duration: 420,
        genre: 'Ambient',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },
      {
        id: 'ambient_3',
        title: 'Cosmic Drift',
        artist: 'Space Ambient',
        duration: 360,
        genre: 'Ambient',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },

      // Rock Genre
      {
        id: 'rock_1',
        title: 'Electric Thunder',
        artist: 'Rock Liberation',
        duration: 220,
        genre: 'Rock',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },
      {
        id: 'rock_2',
        title: 'Highway Anthem',
        artist: 'Open Road Band',
        duration: 240,
        genre: 'Rock',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },
      {
        id: 'rock_3',
        title: 'Rebel Spirit',
        artist: 'Free Rock Alliance',
        duration: 200,
        genre: 'Rock',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },

      // Folk Genre
      {
        id: 'folk_1',
        title: 'Mountain Song',
        artist: 'Folk Heritage',
        duration: 250,
        genre: 'Folk',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },
      {
        id: 'folk_2',
        title: 'River Tale',
        artist: 'Acoustic Storytellers',
        duration: 280,
        genre: 'Folk',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },
      {
        id: 'folk_3',
        title: 'Village Dance',
        artist: 'Traditional Sounds',
        duration: 230,
        genre: 'Folk',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },

      // Blues Genre
      {
        id: 'blues_1',
        title: 'Midnight Blues',
        artist: 'Blues Foundation',
        duration: 280,
        genre: 'Blues',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },
      {
        id: 'blues_2',
        title: 'Delta Dreams',
        artist: 'Mississippi Open',
        duration: 260,
        genre: 'Blues',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },
      {
        id: 'blues_3',
        title: 'Electric Sorrow',
        artist: 'Free Blues Society',
        duration: 300,
        genre: 'Blues',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },

      // Chillout Genre
      {
        id: 'chillout_1',
        title: 'Sunset Lounge',
        artist: 'Chill Collective',
        duration: 270,
        genre: 'Chillout',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },
      {
        id: 'chillout_2',
        title: 'Lazy Sunday',
        artist: 'Relaxed Minds',
        duration: 250,
        genre: 'Chillout',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },
      {
        id: 'chillout_3',
        title: 'Coffee Shop Dreams',
        artist: 'Mellow Beats',
        duration: 220,
        genre: 'Chillout',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },

      // Country Genre
      {
        id: 'country_1',
        title: 'Country Road',
        artist: 'Folk Guitar',
        duration: 200,
        genre: 'Country',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },
      {
        id: 'country_2',
        title: 'Hometown Blues',
        artist: 'Americana Collective',
        duration: 240,
        genre: 'Country',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },
      {
        id: 'country_3',
        title: 'Prairie Wind',
        artist: 'Open Range Band',
        duration: 210,
        genre: 'Country',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },

      // Hip-Pop Genre
      {
        id: 'hip_pop_1',
        title: 'Urban Vibes',
        artist: 'Free Beat Collective',
        duration: 210,
        genre: 'Hip-Pop',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },
      {
        id: 'hip_pop_2',
        title: 'City Nights',
        artist: 'Open Source Rap',
        duration: 180,
        genre: 'Hip-Pop',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },
      {
        id: 'hip_pop_3',
        title: 'Street Poetry',
        artist: 'Creative Commons MC',
        duration: 195,
        genre: 'Hip-Pop',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },

      // Electro Pop Genre
      {
        id: 'electro_pop_1',
        title: 'Neon Nights',
        artist: 'Synth Wave',
        duration: 190,
        genre: 'Electro Pop',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },
      {
        id: 'electro_pop_2',
        title: 'Digital Heart',
        artist: 'Electronic Dreams',
        duration: 210,
        genre: 'Electro Pop',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },
      {
        id: 'electro_pop_3',
        title: 'Cyber Love',
        artist: 'Future Sounds',
        duration: 180,
        genre: 'Electro Pop',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },

      // Downbeat Genre
      {
        id: 'downbeat_1',
        title: 'Slow Motion',
        artist: 'Trip Hop Collective',
        duration: 320,
        genre: 'Downbeat',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },
      {
        id: 'downbeat_2',
        title: 'Urban Shadows',
        artist: 'Downtempo Masters',
        duration: 290,
        genre: 'Downbeat',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },
      {
        id: 'downbeat_3',
        title: 'Night Walker',
        artist: 'Chill Beats',
        duration: 310,
        genre: 'Downbeat',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },

      // New Age Genre
      {
        id: 'new_age_1',
        title: 'Crystal Meditation',
        artist: 'Spiritual Sounds',
        duration: 360,
        genre: 'New Age',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      },
      {
        id: 'new_age_2',
        title: 'Healing Light',
        artist: 'Inner Peace',
        duration: 400,
        genre: 'New Age',
        url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3'
      },
      {
        id: 'new_age_3',
        title: 'Chakra Balance',
        artist: 'Wellness Music',
        duration: 320,
        genre: 'New Age',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      }
    ];
  }

  // Search specifically in Freesound's Music category for proper music playlists
  async searchMusicCategory(query: string): Promise<Track[]> {
    if (!this.isConfigured()) {
      console.warn('Freesound API key not configured, using fallback tracks');
      return this.getFallbackTracks();
    }

    try {
      // Create genre-specific music filters
      const genreFilters = this.getMusicCategoryFilters(query);

      const params = new URLSearchParams({
        token: this.apiKey,
        query: query,
        page_size: '25',
        fields: 'id,name,username,duration,tags,previews,type,license',
        // Target Music category with genre-specific filters
        filter: `type:(wav OR mp3) duration:[30.0 TO 300.0] ${genreFilters}`,
        sort: 'rating_desc'
      });

      console.log('🎵 Searching Freesound Music category:', `${this.baseUrl}/search/text/?${params}`);

      const response = await fetch(`${this.baseUrl}/search/text/?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`Freesound API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Freesound Music category response:', data);

      if (!data.results || data.results.length === 0) {
        console.warn('No music tracks found, trying alternative search');
        return await this.searchTracks(query);
      }

      return await this.convertToTracks(data.results);
    } catch (error) {
      console.error('❌ Error fetching from Freesound Music category:', error);
      return await this.searchTracks(query);
    }
  }

  // Get tracks by specific genres - optimized for speed with parallel processing
  async getTracksByGenres(genres: string[]): Promise<Track[]> {
    console.log('🚀 Fast loading for genres:', genres);
    console.log('🎵 API configured:', this.isConfigured());

    if (!this.isConfigured()) {
      console.error('❌ Freesound API not configured! Using fallback tracks.');
      return this.getFallbackTracks().filter(track =>
        genres.some(genre => track.genre.toLowerCase() === genre.toLowerCase())
      );
    }

    try {
      // Process all genres in parallel for faster loading
      console.log('⚡ Processing all genres in parallel...');
      const genrePromises = genres.map(async (genre) => {
        try {
          // Use optimized single search strategy per genre
          const tracks = await this.searchMusicCategoryWithGenre(genre);
          console.log(`✅ Found ${tracks.length} tracks for ${genre}`);
          return tracks;
        } catch (error) {
          console.warn(`⚠️ Error loading ${genre}:`, error.message);
          return []; // Return empty array instead of throwing
        }
      });

      // Wait for all genres to complete in parallel
      const results = await Promise.all(genrePromises);
      const allTracks = results.flat();

      // Remove duplicates efficiently
      const uniqueTracks = allTracks.filter((track, index, self) =>
        index === self.findIndex(t => t.id === track.id)
      );

      // Randomize track order to avoid repetition on repeated requests
      const randomizedTracks = this.shuffleArray(uniqueTracks);
      console.log(`⚡ Fast loading complete: ${randomizedTracks.length} tracks randomized for genres: ${genres.join(', ')}`);

      // Log API results by genre for multiple selections
      if (genres.length > 1) {
        console.log('🎼 API results by genre (randomized):');
        genres.forEach(genre => {
          const genreTracks = randomizedTracks.filter(track => track.genre.toLowerCase() === genre.toLowerCase());
          console.log(`   - ${genre}: ${genreTracks.length} tracks from API`);
        });
      }

      // Add fallback tracks only if we have very few results
      if (uniqueTracks.length < 5) {
        console.log('🔄 Adding fallback tracks for better experience');
        const fallbackTracks = this.getFallbackTracks().filter(track =>
          genres.some(genre => track.genre.toLowerCase() === genre.toLowerCase())
        );

        // Add fallbacks that don't already exist
        const tracksToAdd = fallbackTracks.filter(fallback =>
          !uniqueTracks.find(existing => existing.id === fallback.id)
        );

        uniqueTracks.push(...tracksToAdd.slice(0, 10)); // Limit fallbacks
        console.log(`🔄 Added ${tracksToAdd.length} fallback tracks`);
      }

      console.log(`✅ Total tracks loaded: ${uniqueTracks.length}`);
      return uniqueTracks;

    } catch (error) {
      console.error('❌ Parallel loading failed:', error);
      // Return genre-filtered fallback tracks
      return this.getFallbackTracks().filter(track =>
        genres.some(genre => track.genre.toLowerCase() === genre.toLowerCase())
      );
    }
  }

  // Get specific search terms for each genre to target Freesound Music category
  private getGenreSearchTerms(genre: string): string[] {
    const searchTermsMap: { [key: string]: string[] } = {
      'Classical': ['classical', 'piano', 'orchestra', 'symphony', 'chamber music', 'baroque'],
      'Ambient': ['ambient', 'atmospheric', 'soundscape', 'ambient music', 'drone', 'minimalist'],
      'Jazz': ['jazz', 'smooth jazz', 'blues', 'swing', 'bebop', 'jazz instrumental'],
      'Folk': ['folk', 'acoustic', 'traditional', 'bluegrass', 'folk music'],
      'Rock': ['rock', 'electric guitar', 'rock music', 'alternative', 'indie rock'],
      'Blues': ['blues', 'delta blues', 'electric blues', 'blues guitar', 'blues music'],
      'Chillout': ['chill', 'chillout', 'downtempo', 'lounge', 'relaxed music'],
      'Country': ['country', 'country music', 'bluegrass', 'americana', 'western'],
      'Hip-Pop': ['hip hop', 'rap', 'urban', 'hip hop music', 'beats'],
      'Electro Pop': ['electronic', 'synth', 'electro', 'synthpop', 'electronic music'],
      'Downbeat': ['downbeat', 'trip hop', 'downtempo', 'chillhop', 'lofi'],
      'New Age': ['new age', 'meditation', 'zen', 'spiritual music', 'healing music']
    };

    return searchTermsMap[genre] || [genre.toLowerCase()];
  }

  // Get Music category specific filters for each genre - simplified to avoid 404 errors
  private getMusicCategoryFilters(genre: string): string {
    const filterMap: { [key: string]: string } = {
      'Classical': 'tag:music tag:classical',
      'Ambient': 'tag:music tag:ambient',
      'Jazz': 'tag:music tag:jazz',
      'Folk': 'tag:music tag:folk',
      'Rock': 'tag:music tag:rock',
      'Blues': 'tag:music tag:blues',
      'Chillout': 'tag:music tag:chill',
      'Country': 'tag:music tag:country',
      'Hip-Pop': 'tag:music tag:hip-hop',
      'Electro Pop': 'tag:music tag:electronic',
      'Downbeat': 'tag:music tag:downtempo',
      'New Age': 'tag:music tag:meditation'
    };

    return filterMap[genre] || `tag:music tag:${genre.toLowerCase()}`;
  }

  // Dynamic playlist randomization methods
  private getRandomSearchVariations(baseQuery: string): string[] {
    const variations: { [key: string]: string[] } = {
      'Classical': ['classical', 'piano', 'orchestra', 'symphony', 'chamber', 'baroque', 'romantic', 'instrumental'],
      'Ambient': ['ambient', 'atmospheric', 'soundscape', 'drone', 'minimalist', 'meditative', 'ethereal'],
      'Jazz': ['jazz', 'smooth jazz', 'blues', 'swing', 'bebop', 'fusion', 'instrumental jazz', 'contemporary jazz'],
      'Folk': ['folk', 'acoustic', 'traditional', 'bluegrass', 'country folk', 'indie folk', 'singer songwriter'],
      'Rock': ['rock', 'electric guitar', 'alternative', 'indie rock', 'classic rock', 'soft rock', 'progressive'],
      'Blues': ['blues', 'delta blues', 'electric blues', 'blues guitar', 'country blues', 'chicago blues'],
      'Chillout': ['chill', 'chillout', 'downtempo', 'lounge', 'relaxed', 'calm', 'peaceful'],
      'Country': ['country', 'bluegrass', 'americana', 'western', 'country music', 'nashville'],
      'Hip-Pop': ['hip hop', 'rap', 'urban', 'beats', 'instrumental hip hop', 'boom bap'],
      'Electro Pop': ['electronic', 'synth', 'electro', 'synthpop', 'electronica', 'techno', 'house'],
      'Downbeat': ['downbeat', 'trip hop', 'downtempo', 'chillhop', 'lofi', 'breakbeat'],
      'New Age': ['new age', 'meditation', 'zen', 'spiritual', 'healing', 'wellness', 'mindfulness']
    };

    const baseVariations = variations[baseQuery] || [baseQuery.toLowerCase()];

    // Add some common music descriptors for more variety
    const descriptors = ['instrumental', 'melodic', 'rhythmic', 'harmonic', 'composition'];
    const expanded = [...baseVariations];

    // Add combinations with descriptors (randomly pick a few)
    for (let i = 0; i < 3; i++) {
      const randomBase = baseVariations[Math.floor(Math.random() * baseVariations.length)];
      const randomDescriptor = descriptors[Math.floor(Math.random() * descriptors.length)];
      expanded.push(`${randomBase} ${randomDescriptor}`);
    }

    return expanded;
  }

  private getRandomSort(): string {
    const sortOptions = [
      'rating_desc',      // Highest rated first
      'downloads_desc',   // Most downloaded first
      'created_desc',     // Newest first
      'duration_desc',    // Longest first
      'duration_asc',     // Shortest first
      'score',           // Relevance score
      'created_asc'      // Oldest first (for vintage finds)
    ];

    return sortOptions[Math.floor(Math.random() * sortOptions.length)];
  }

  private getRandomPage(): number {
    // Random page between 1 and 5 to get different result sets
    // Higher pages might have less relevant results, so we limit the range
    return Math.floor(Math.random() * 5) + 1;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Genre-aware search methods that preserve the target genre with dynamic randomization
  private async searchTracksWithGenre(query: string, targetGenre: string, filters: any = {}): Promise<Track[]> {
    if (!this.isConfigured()) {
      console.warn('Freesound API key not configured, using fallback tracks');
      return this.shuffleArray(this.getFallbackTracks());
    }

    try {
      // Use simplified search approach to avoid 404 errors
      const params = new URLSearchParams({
        token: this.apiKey,
        query: `${query} music`,
        page_size: '20',
        page: '1', // Start with page 1 to avoid empty results
        fields: 'id,name,username,duration,tags,previews,type,license',
        filter: `type:(wav OR mp3) duration:[30.0 TO 180.0]`, // Simplified filter
        sort: 'rating_desc' // Use consistent sorting
      });

      console.log(`🎵 Simplified search for ${targetGenre}: query="${query}", URL: ${this.baseUrl}/search/text/?${params}`);

      const response = await fetch(`${this.baseUrl}/search/text/?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });

      if (!response.ok) {
        let errorText = 'Unknown error';
        try {
          errorText = await response.text();
        } catch (textError) {
          console.warn('Could not read error response text:', textError);
          errorText = `HTTP ${response.status} ${response.statusText}`;
        }
        console.error(`❌ Freesound API error for ${targetGenre}:`, response.status, errorText);

        // Instead of throwing, return empty array and let caller handle fallback
        return [];
      }

      const data = await response.json();
      console.log(`✅ Found ${data.count || 0} total results for ${targetGenre} with simplified search`);

      if (!data.results || data.results.length === 0) {
        console.warn(`❌ No tracks found in Freesound API response for ${targetGenre}`);
        return [];
      }

      const convertedTracks = await this.convertToTracks(data.results, targetGenre);
      const shuffledTracks = this.shuffleArray(convertedTracks);
      console.log(`✅ Converted and shuffled ${shuffledTracks.length} tracks for genre: ${targetGenre}`);
      return shuffledTracks;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`❌ Freesound API request timed out for genre: ${targetGenre}`);
      } else if (error.message.includes('Failed to fetch')) {
        console.error(`❌ Network error connecting to Freesound API for genre: ${targetGenre} - check internet connection`);
      } else {
        console.error(`❌ Error fetching from Freesound for genre: ${targetGenre}:`, error);
      }

      // Return empty array instead of fallback tracks here to let higher-level methods handle fallbacks
      return [];
    }
  }

  private async searchMusicCategoryWithGenre(genre: string): Promise<Track[]> {
    try {
      // Use optimized single strategy for faster loading
      return await this.trySimpleGenreSearch(genre);
    } catch (error) {
      console.warn(`⚠️ Search failed for ${genre}:`, error.message);
      return [];
    }
  }

  private async trySimpleGenreSearch(genre: string): Promise<Track[]> {
    const params = new URLSearchParams({
      token: this.apiKey,
      query: `${genre.toLowerCase()} music`,
      page_size: '10', // Optimized for fastest loading
      fields: 'id,name,username,duration,previews', // Minimal fields for speed
      filter: `type:(wav OR mp3) duration:[30.0 TO 180.0]`, // Simplified filter
      sort: 'downloads_desc' // Consistent, fast sorting
    });

    console.log(`⚡ Fast search for ${genre}`);

    const response = await fetch(`${this.baseUrl}/search/text/?${params}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`⚡ Found ${data.results?.length || 0} tracks for ${genre}`);
    return await this.convertToTracks(data.results || [], genre);
  }

}

export const freesoundService = FreesoundService.getInstance();
