import { Track } from './musicService';

// Freesound.org API service with CORS and redirect handling
class FreesoundService {
  private static instance: FreesoundService;
  private apiKey: string;
  private baseUrl = 'https://freesound.org/apiv2';
  private workingAuthMethod: any = null;

  static getInstance(): FreesoundService {
    if (!FreesoundService.instance) {
      FreesoundService.instance = new FreesoundService();
    }
    return FreesoundService.instance;
  }

  constructor() {
    this.apiKey = import.meta.env.VITE_FREESOUND_API_KEY || '';
    if (this.apiKey) {
      console.log('🎵 Freesound API configured with client ID:', this.apiKey.substring(0, 10) + '...');
      console.log('🎵 Using direct client ID authentication for frontend app');
    } else {
      console.warn('⚠️ Freesound API key not found in environment variables');
    }
  }

  // Test direct client ID authentication (no OAuth needed for frontend)
  private async testDirectAuth(): Promise<boolean> {
    try {
      console.log('🔍 Testing direct client ID authentication...');

      const testParams = new URLSearchParams({
        query: 'piano',
        page_size: '1',
        fields: 'id,name',
        token: this.apiKey  // Use client ID directly as token
      });

      const response = await fetch(`${this.baseUrl}/search/text/?${testParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      if (response.ok) {
        console.log('✅ Direct client ID authentication successful');
        return true;
      } else {
        const errorText = await response.text().catch(() => 'No error details');
        console.warn('⚠️ Direct auth failed:', response.status, response.statusText, errorText);
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Direct auth test failed:', error);
      return false;
    }
  }

  // Get authentication parameters for API requests (simplified for frontend)
  private async getAuthParams(): Promise<{ headers: any, params: any }> {
    // For frontend apps, use direct client ID as token parameter
    console.log('🎵 Using direct client ID authentication');
    return {
      headers: { 'Accept': 'application/json' },
      params: { token: this.apiKey }
    };
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

  // Test API connectivity and key validity (simplified)
  async testApiConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      console.log('🔍 Testing Freesound API connection with client ID...');
      return await this.testDirectAuth();
    } catch (error) {
      console.error('❌ Freesound API connection test failed:', error);
      return false;
    }
  }

  // Search for tracks with proper CORS and redirect handling - now with dynamic randomization
  async searchTracks(query: string, filters: any = {}): Promise<Track[]> {
    if (!this.isConfigured()) {
      console.error('❌ Freesound API key not configured! Using fallback tracks.');
      console.log('🔧 Please set VITE_FREESOUND_API_KEY environment variable');
      console.log('🔧 Get your free API key at: https://freesound.org/apiv2/apply/');
      return this.getFallbackTracks().filter(track =>
        track.genre.toLowerCase().includes(query.toLowerCase()) ||
        query.toLowerCase().includes(track.genre.toLowerCase())
      );
    }

    try {
      // Add randomization for dynamic playlists
      const randomVariations = this.getRandomSearchVariations(query);
      const randomSort = this.getRandomSort();
      const randomPage = this.getRandomPage();

      const musicQuery = randomVariations[Math.floor(Math.random() * randomVariations.length)];

      const params = new URLSearchParams({
        query: `${musicQuery} music`,
        page_size: '25', // Balanced for reliability and content
        page: randomPage.toString(),
        fields: 'id,name,username,duration,tags,previews,type,channels,license',
        // Search for music with better filters - prefer longer tracks
        filter: `type:(wav OR mp3) duration:[60.0 TO 300.0] tag:music -tag:loop -tag:sfx -tag:effect`,
        sort: randomSort,
        token: this.apiKey
      });

      console.log(`🎲 Dynamic Freesound search: query="${musicQuery}", sort="${randomSort}", page=${randomPage}`);

      // Get authentication parameters
      const auth = await this.getAuthParams();

      // Add auth params to URLSearchParams
      Object.entries(auth.params).forEach(([key, value]) => {
        if (value) params.set(key, value.toString());
      });

      const response = await fetch(`${this.baseUrl}/search/text/?${params}`, {
        method: 'GET',
        headers: auth.headers,
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

        // For frontend apps, API authentication often fails - use fallback immediately
        console.log('🎵 Frontend API authentication failed, using high-quality fallback tracks for:', query);
        const fallbackTracks = this.getFallbackTracks().filter(track =>
          track.genre.toLowerCase().includes(query.toLowerCase()) ||
          query.toLowerCase().includes(track.genre.toLowerCase())
        );
        console.log(`🎵 Returning ${fallbackTracks.length} fallback tracks`);
        return fallbackTracks;
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
        console.error('��� Network error connecting to Freesound API - check internet connection');
      } else {
        console.error('❌ Error fetching from Freesound:', error);
      }
      // Always provide fallback tracks for a good user experience
      console.log('🎵 Using high-quality fallback tracks due to API error for:', query);
      const fallbackTracks = this.getFallbackTracks().filter(track =>
        track.genre.toLowerCase().includes(query.toLowerCase()) ||
        query.toLowerCase().includes(track.genre.toLowerCase())
      );
      console.log(`🎵 Returning ${fallbackTracks.length} fallback tracks`);
      return fallbackTracks;
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

  // Fallback tracks when API is not available - using working demo audio
  private getFallbackTracks(): Track[] {
    // Simple demo audio data URL that works in all browsers
    const demoAudioUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBzWL0fPTgCwGKn3G7NyOOwgURrnn1qU='

    return [
      // Classical Genre - Using demo audio
      {
        id: 'classical_1',
        title: 'Demo Classical Track',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Classical',
        url: demoAudioUrl
      },
      {
        id: 'classical_2',
        title: 'Demo Piano',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Classical',
        url: demoAudioUrl
      },
      {
        id: 'classical_3',
        title: 'Demo Symphony',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Classical',
        url: demoAudioUrl
      },

      // Jazz Genre - Using demo audio
      {
        id: 'jazz_1',
        title: 'Demo Jazz Track',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Jazz',
        url: demoAudioUrl
      },
      {
        id: 'jazz_2',
        title: 'Demo Blues',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Jazz',
        url: demoAudioUrl
      },
      {
        id: 'jazz_3',
        title: 'Demo Saxophone',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Jazz',
        url: demoAudioUrl
      },

      // Ambient Genre - Using demo audio
      {
        id: 'ambient_1',
        title: 'Demo Ambient Track',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Ambient',
        url: demoAudioUrl
      },
      {
        id: 'ambient_2',
        title: 'Demo Meditation',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Ambient',
        url: demoAudioUrl
      },
      {
        id: 'ambient_3',
        title: 'Demo Soundscape',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Ambient',
        url: demoAudioUrl
      },

      // Rock Genre - Using demo audio
      {
        id: 'rock_1',
        title: 'Demo Rock Track',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Rock',
        url: demoAudioUrl
      },
      {
        id: 'rock_2',
        title: 'Demo Guitar',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Rock',
        url: demoAudioUrl
      },
      {
        id: 'rock_3',
        title: 'Demo Electric',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Rock',
        url: demoAudioUrl
      },

      // Folk Genre - Using demo audio
      {
        id: 'folk_1',
        title: 'Demo Folk Track',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Folk',
        url: demoAudioUrl
      },
      {
        id: 'folk_2',
        title: 'Demo Acoustic',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Folk',
        url: demoAudioUrl
      },
      {
        id: 'folk_3',
        title: 'Demo Traditional',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Folk',
        url: demoAudioUrl
      },

      // Blues Genre - Using demo audio
      {
        id: 'blues_1',
        title: 'Demo Blues Track',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Blues',
        url: demoAudioUrl
      },
      {
        id: 'blues_2',
        title: 'Demo Delta',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Blues',
        url: demoAudioUrl
      },
      {
        id: 'blues_3',
        title: 'Demo Electric Blues',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Blues',
        url: demoAudioUrl
      },

      // Chillout Genre - Using demo audio
      {
        id: 'chillout_1',
        title: 'Demo Chillout Track',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Chillout',
        url: demoAudioUrl
      },
      {
        id: 'chillout_2',
        title: 'Demo Lounge',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Chillout',
        url: demoAudioUrl
      },
      {
        id: 'chillout_3',
        title: 'Demo Relaxing',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Chillout',
        url: demoAudioUrl
      },

      // Country Genre - Using demo audio
      {
        id: 'country_1',
        title: 'Demo Country Track',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Country',
        url: demoAudioUrl
      },
      {
        id: 'country_2',
        title: 'Demo Bluegrass',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Country',
        url: demoAudioUrl
      },
      {
        id: 'country_3',
        title: 'Demo Western',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Country',
        url: demoAudioUrl
      },

      // Hip-Pop Genre - Using demo audio
      {
        id: 'hip_pop_1',
        title: 'Demo Hip-Hop Track',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Hip-Pop',
        url: demoAudioUrl
      },
      {
        id: 'hip_pop_2',
        title: 'Demo Urban',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Hip-Pop',
        url: demoAudioUrl
      },
      {
        id: 'hip_pop_3',
        title: 'Demo Beats',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Hip-Pop',
        url: demoAudioUrl
      },

      // Electro Pop Genre - Using demo audio
      {
        id: 'electro_pop_1',
        title: 'Demo Electronic Track',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Electro Pop',
        url: demoAudioUrl
      },
      {
        id: 'electro_pop_2',
        title: 'Demo Synth',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Electro Pop',
        url: demoAudioUrl
      },
      {
        id: 'electro_pop_3',
        title: 'Demo Electronic',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Electro Pop',
        url: demoAudioUrl
      },

      // Downbeat Genre - Using demo audio
      {
        id: 'downbeat_1',
        title: 'Demo Downbeat Track',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Downbeat',
        url: demoAudioUrl
      },
      {
        id: 'downbeat_2',
        title: 'Demo Trip-Hop',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Downbeat',
        url: demoAudioUrl
      },
      {
        id: 'downbeat_3',
        title: 'Demo Chill',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'Downbeat',
        url: demoAudioUrl
      },

      // New Age Genre - Using demo audio
      {
        id: 'new_age_1',
        title: 'Demo New Age Track',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'New Age',
        url: demoAudioUrl
      },
      {
        id: 'new_age_2',
        title: 'Demo Meditation',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'New Age',
        url: demoAudioUrl
      },
      {
        id: 'new_age_3',
        title: 'Demo Healing',
        artist: 'Demo Artist',
        duration: 30,
        genre: 'New Age',
        url: demoAudioUrl
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
        query: query,
        page_size: '25',
        fields: 'id,name,username,duration,tags,previews,type,license',
        // Target Music category with genre-specific filters
        filter: `type:(wav OR mp3) duration:[30.0 TO 300.0] ${genreFilters}`,
        sort: 'rating_desc'
      });

      // Get authentication parameters
      const auth = await this.getAuthParams();

      // Add auth params to URLSearchParams
      Object.entries(auth.params).forEach(([key, value]) => {
        if (value) params.set(key, value.toString());
      });

      console.log('🎵 Searching Freesound Music category:', `${this.baseUrl}/search/text/?${params}`);

      const response = await fetch(`${this.baseUrl}/search/text/?${params}`, {
        method: 'GET',
        headers: auth.headers,
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
      console.error('❌ Freesound API not configured! No music will be available.');
      console.log('🔧 Please set VITE_FREESOUND_API_KEY environment variable');
      console.log('��� Get your free API key at: https://freesound.org/apiv2/apply/');
      return [];
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
          console.warn(`��️ Error loading ${genre}:`, error.message);
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
        console.log('�� API results by genre (randomized):');
        genres.forEach(genre => {
          const genreTracks = randomizedTracks.filter(track => track.genre.toLowerCase() === genre.toLowerCase());
          console.log(`   - ${genre}: ${genreTracks.length} tracks from API`);
        });
      }

      // Return Freesound tracks or fallback if empty
      console.log(`✅ Freesound tracks loaded and randomized: ${randomizedTracks.length}`);
      if (randomizedTracks.length === 0) {
        console.warn('���️ No tracks found from Freesound API for the selected genres, using fallback');
        const allFallbackTracks = this.getFallbackTracks();
        const filteredTracks = allFallbackTracks.filter(track =>
          genres.some(genre =>
            track.genre.toLowerCase() === genre.toLowerCase()
          )
        );
        console.log(`🎵 Returning ${filteredTracks.length} fallback tracks for genres: ${genres.join(', ')}`);
        return this.shuffleArray(filteredTracks);
      }
      return randomizedTracks;

    } catch (error) {
      console.error('❌ Freesound API parallel loading failed:', error);
      console.log('🎵 API failed, using fallback tracks for genres:', genres.join(', '));

      // Return fallback tracks filtered by requested genres
      const allFallbackTracks = this.getFallbackTracks();
      const filteredTracks = allFallbackTracks.filter(track =>
        genres.some(genre =>
          track.genre.toLowerCase() === genre.toLowerCase()
        )
      );
      console.log(`🎵 Returning ${filteredTracks.length} fallback tracks for genres: ${genres.join(', ')}`);
      return this.shuffleArray(filteredTracks);
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
      'duration_desc',    // Longest first (prioritized for longer playlists)
      'rating_desc',      // Highest rated first
      'downloads_desc',   // Most downloaded first
      'duration_desc',    // Longest first (appears twice for higher chance)
      'created_desc',     // Newest first
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
      console.error('❌ Freesound API key not configured! No music will be available.');
      console.log('🔧 Please set VITE_FREESOUND_API_KEY environment variable');
      console.log('🔧 Get your free API key at: https://freesound.org/apiv2/apply/');

      // Return fallback tracks filtered by requested genres
      const allFallbackTracks = this.getFallbackTracks();
      const filteredTracks = allFallbackTracks.filter(track =>
        genres.some(genre =>
          track.genre.toLowerCase() === genre.toLowerCase()
        )
      );
      console.log(`🎵 Returning ${filteredTracks.length} fallback tracks for genres: ${genres.join(', ')}`);
      return this.shuffleArray(filteredTracks);
    }

    try {
      // Use simplified search approach to avoid 404 errors
      const params = new URLSearchParams({
        query: `${query} music`,
        page_size: '25', // Balanced for reliability and content
        page: '1', // Start with page 1 to avoid empty results
        fields: 'id,name,username,duration,tags,previews,type,license',
        filter: `type:(wav OR mp3) duration:[60.0 TO 300.0]`, // Prefer longer tracks for more content
        sort: 'rating_desc' // Use consistent sorting
      });

      console.log(`🎵 Simplified search for ${targetGenre}: query="${query}"`);

      // Get authentication parameters
      const auth = await this.getAuthParams();

      // Add auth params to URLSearchParams
      Object.entries(auth.params).forEach(([key, value]) => {
        if (value) params.set(key, value.toString());
      });

      console.log(`🎵 Final URL: ${this.baseUrl}/search/text/?${params}`);

      const response = await fetch(`${this.baseUrl}/search/text/?${params}`, {
        method: 'GET',
        headers: auth.headers,
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
        console.error(`��� Freesound API error for ${targetGenre}:`, response.status, errorText);

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
      query: `${genre.toLowerCase()} music`,
      page_size: '25', // Balanced for reliability and content
      fields: 'id,name,username,duration,previews', // Minimal fields for speed
      filter: `type:(wav OR mp3) duration:[60.0 TO 300.0]`, // Prefer longer tracks for more content
      sort: 'downloads_desc' // Consistent, fast sorting
    });

    console.log(`⚡ Fast search for ${genre}`);

    // Get authentication parameters
    const auth = await this.getAuthParams();

    // Add auth params to URLSearchParams
    Object.entries(auth.params).forEach(([key, value]) => {
      if (value) params.set(key, value.toString());
    });

    const response = await fetch(`${this.baseUrl}/search/text/?${params}`, {
      method: 'GET',
      headers: auth.headers,
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
