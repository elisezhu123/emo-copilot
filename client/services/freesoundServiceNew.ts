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
    return configured;
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
      console.error('❌ Error fetching from Freesound:', error);
      return this.shuffleArray(this.getFallbackTracks());
    }
  }

  // Get direct audio URL and verify it works
  private async getDirectAudioUrl(previewUrl: string): Promise<string> {
    try {
      console.log('🔗 Testing audio URL:', previewUrl);
      
      // Test if the URL is accessible
      const response = await fetch(previewUrl, {
        method: 'HEAD',
        mode: 'cors'
      });
      
      if (response.ok) {
        console.log('✅ Audio URL verified:', previewUrl);
        return previewUrl;
      } else {
        console.warn('⚠️ Audio URL returned status:', response.status);
        return previewUrl; // Return anyway, might still work
      }
    } catch (error) {
      console.warn('⚠️ Could not verify audio URL:', error);
      // Return the original URL anyway
      return previewUrl;
    }
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

        // Get the direct audio URL by following redirects
        const directUrl = await this.getDirectAudioUrl(previewUrl);

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

  // Get tracks by specific genres - ensure at least 10 tracks
  async getTracksByGenres(genres: string[]): Promise<Track[]> {
    console.log('🎵 getTracksByGenres called with:', genres);
    console.log('🎵 API configured:', this.isConfigured());
    console.log('🎵 API key available:', !!this.apiKey);

    if (!this.isConfigured()) {
      console.error('❌ Freesound API not configured! Cannot fetch real music.');
      return this.getFallbackTracks().filter(track =>
        genres.some(genre => track.genre.toLowerCase() === genre.toLowerCase())
      );
    }

    const allTracks: Track[] = [];

    for (const genre of genres) {
      console.log(`🎵 Searching Freesound API for ${genre} music...`);

      try {
        // First try Music category search for proper music playlists
        const musicCategoryTracks = await this.searchMusicCategoryWithGenre(genre);
        console.log(`✅ Found ${musicCategoryTracks.length} tracks for ${genre} from music category`);
        allTracks.push(...musicCategoryTracks);

        // If not enough tracks from music category, try genre-specific search
        if (musicCategoryTracks.length < 3) {
          console.log(`🔄 Trying additional search for ${genre}...`);
          const genreSearchTerms = this.getGenreSearchTerms(genre);

          for (const searchTerm of genreSearchTerms) {
            const tracks = await this.searchTracksWithGenre(searchTerm, genre, {
              duration: 'duration:[30.0 TO 180.0]'
            });
            console.log(`✅ Found ${tracks.length} additional tracks for search term: ${searchTerm}`);
            allTracks.push(...tracks);

            // Limit per genre to avoid too many tracks
            if (allTracks.length >= 30) break;
          }
        }
      } catch (error) {
        console.error(`❌ Error searching for ${genre}:`, error);
      }
    }

    // Remove duplicates
    const uniqueTracks = allTracks.filter((track, index, self) =>
      index === self.findIndex(t => t.id === track.id)
    );

    // Always use genre-filtered fallback tracks when API fails or returns insufficient results
    console.log(`🎵 Using fallback tracks for genres: ${genres.join(', ')}`);
    const fallbackTracks = this.getFallbackTracks();

    // Filter fallback tracks by selected genres
    const relevantFallbacks = fallbackTracks.filter(track =>
      genres.some(genre =>
        track.genre.toLowerCase() === genre.toLowerCase()
      )
    );

    console.log(`🎵 Found ${relevantFallbacks.length} genre-specific fallback tracks`);

    // Use filtered fallback tracks (prioritize genre-specific tracks)
    const tracksToAdd = relevantFallbacks.length > 0 ? relevantFallbacks : [];

    // Add fallback tracks, ensuring no duplicates
    for (const track of tracksToAdd) {
      if (!uniqueTracks.find(t => t.id === track.id)) {
        uniqueTracks.push(track);
      }
    }

    // If no API tracks and no relevant fallbacks, add at least some tracks
    if (uniqueTracks.length === 0) {
      console.log('🎵 No genre-specific tracks found, adding default tracks');
      const defaultTracks = fallbackTracks.slice(0, 6); // Add first 6 tracks as default
      uniqueTracks.push(...defaultTracks);
    }

    console.log(`✅ Total music tracks loaded: ${uniqueTracks.length}`);
    return uniqueTracks;
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

  // Get Music category specific filters for each genre
  private getMusicCategoryFilters(genre: string): string {
    const filterMap: { [key: string]: string } = {
      'Classical': 'tag:music (tag:classical OR tag:piano OR tag:orchestra OR tag:symphony OR tag:chamber)',
      'Ambient': 'tag:music (tag:ambient OR tag:atmospheric OR tag:soundscape OR tag:drone)',
      'Jazz': 'tag:music (tag:jazz OR tag:blues OR tag:swing OR tag:smooth)',
      'Folk': 'tag:music (tag:folk OR tag:acoustic OR tag:traditional)',
      'Rock': 'tag:music (tag:rock OR tag:guitar OR tag:electric OR tag:alternative)',
      'Blues': 'tag:music (tag:blues OR tag:delta OR tag:electric OR tag:guitar)',
      'Chillout': 'tag:music (tag:chill OR tag:chillout OR tag:downtempo OR tag:lounge OR tag:relaxed)',
      'Country': 'tag:music (tag:country OR tag:bluegrass OR tag:americana OR tag:western)',
      'Hip-Pop': 'tag:music (tag:hip OR tag:hop OR tag:rap OR tag:urban OR tag:beats)',
      'Electro Pop': 'tag:music (tag:electronic OR tag:synth OR tag:electro OR tag:synthpop)',
      'Downbeat': 'tag:music (tag:downbeat OR tag:trip OR tag:downtempo OR tag:chillhop OR tag:lofi)',
      'New Age': 'tag:music (tag:new OR tag:age OR tag:meditation OR tag:zen OR tag:spiritual OR tag:healing)'
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
        filter: `type:(wav OR mp3) duration:[20.0 TO 180.0] tag:music -tag:loop -tag:sfx -tag:effect`,
        sort: randomSort
      });

      console.log(`🎲 Dynamic search for ${targetGenre}: query="${musicQuery}", sort="${randomSort}", page=${randomPage}`);

      const response = await fetch(`${this.baseUrl}/search/text/?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Freesound API error response:', errorText);
        throw new Error(`Freesound API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Found', data.count, 'total results for', targetGenre, 'with dynamic search');

      if (!data.results || data.results.length === 0) {
        console.warn('❌ No tracks found in Freesound API response for', targetGenre);
        return [];
      }

      const convertedTracks = await this.convertToTracks(data.results, targetGenre);
      // Shuffle the results for additional randomness
      const shuffledTracks = this.shuffleArray(convertedTracks);
      console.log('✅ Converted and shuffled', shuffledTracks.length, 'tracks for genre:', targetGenre);
      return shuffledTracks;
    } catch (error) {
      console.error('❌ Error fetching from Freesound:', error);
      return this.shuffleArray(this.getFallbackTracks());
    }
  }

  private async searchMusicCategoryWithGenre(genre: string): Promise<Track[]> {
    try {
      const filter = this.getMusicCategoryFilters(genre);
      const randomSort = this.getRandomSort();
      const randomPage = this.getRandomPage();
      const randomVariations = this.getRandomSearchVariations(genre);
      const randomQuery = randomVariations[Math.floor(Math.random() * randomVariations.length)];

      const params = new URLSearchParams({
        token: this.apiKey,
        query: `${randomQuery} music`,
        page_size: '20',
        page: randomPage.toString(),
        fields: 'id,name,username,duration,tags,previews,type,channels,license',
        filter: `type:(wav OR mp3) duration:[30.0 TO 180.0] ${filter}`,
        sort: randomSort
      });

      console.log(`🎲 Dynamic music category search for ${genre}: query="${randomQuery}", sort="${randomSort}", page=${randomPage}`);

      const response = await fetch(`${this.baseUrl}/search/text/?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`Music category search failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Dynamic music category search found', data.results?.length || 0, 'tracks for', genre);

      const tracks = await this.convertToTracks(data.results || [], genre);
      return this.shuffleArray(tracks);
    } catch (error) {
      console.error('❌ Music category search failed for', genre, ':', error);
      return [];
    }
  }
}

export const freesoundService = FreesoundService.getInstance();
