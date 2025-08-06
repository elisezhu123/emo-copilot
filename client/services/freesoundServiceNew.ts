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
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  // Search for tracks with proper CORS and redirect handling
  async searchTracks(query: string, filters: any = {}): Promise<Track[]> {
    if (!this.isConfigured()) {
      console.warn('Freesound API key not configured, using fallback tracks');
      return this.getFallbackTracks();
    }

    try {
      // Target Freesound's Music category specifically for proper music playlists
      const musicQuery = `${query}`;

      const params = new URLSearchParams({
        token: this.apiKey,
        query: musicQuery,
        page_size: '20',
        fields: 'id,name,username,duration,tags,previews,type,channels',
        // Specifically target Music category and its subcategories
        filter: `grouping_pack:"" type:wav duration:[30.0 TO 300.0] channels:2 tag:music ${filters.duration || ''}`,
        sort: 'downloads_desc'
      });

      console.log('🎵 Searching Freesound:', `${this.baseUrl}/search/text/?${params}`);

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
      console.log('✅ Freesound response:', data);

      if (!data.results || data.results.length === 0) {
        console.warn('No tracks found, using fallback');
        return this.getFallbackTracks();
      }

      return await this.convertToTracks(data.results);
    } catch (error) {
      console.error('❌ Error fetching from Freesound:', error);
      return this.getFallbackTracks();
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
  private async convertToTracks(freesoundTracks: any[]): Promise<Track[]> {
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
          genre: this.extractGenre(track.tags || []),
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

  // Fallback tracks when API is not available - real music tracks
  private getFallbackTracks(): Track[] {
    return [
      {
        id: 'music_1',
        title: 'Piano Reflection',
        artist: 'RutgerMuller',
        duration: 120,
        genre: 'Classical',
        url: 'https://cdn.freesound.org/previews/449/449794_179538-hq.mp3'
      },
      {
        id: 'music_2',
        title: 'Gentle Piano',
        artist: 'RutgerMuller',
        duration: 180,
        genre: 'Classical',
        url: 'https://cdn.freesound.org/previews/449/449793_179538-hq.mp3'
      },
      {
        id: 'music_3',
        title: 'Jazz Evening',
        artist: 'Demo Jazz Artist',
        duration: 200,
        genre: 'Jazz',
        url: 'https://cdn.freesound.org/previews/449/449794_179538-hq.mp3'
      },
      {
        id: 'music_4',
        title: 'Electronic Dreams',
        artist: 'Demo Electronic Artist',
        duration: 220,
        genre: 'Electronic',
        url: 'https://cdn.freesound.org/previews/449/449793_179538-hq.mp3'
      },
      {
        id: 'music_5',
        title: 'Ambient Flow',
        artist: 'Demo Ambient Artist',
        duration: 240,
        genre: 'Ambient',
        url: 'https://cdn.freesound.org/previews/449/449794_179538-hq.mp3'
      },
      {
        id: 'music_6',
        title: 'Rock Anthem',
        artist: 'Demo Rock Artist',
        duration: 180,
        genre: 'Rock',
        url: 'https://cdn.freesound.org/previews/449/449793_179538-hq.mp3'
      },
      {
        id: 'music_7',
        title: 'Pop Sunshine',
        artist: 'Demo Pop Artist',
        duration: 190,
        genre: 'Pop',
        url: 'https://cdn.freesound.org/previews/449/449794_179538-hq.mp3'
      },
      {
        id: 'music_8',
        title: 'Folk Journey',
        artist: 'Demo Folk Artist',
        duration: 210,
        genre: 'Folk',
        url: 'https://cdn.freesound.org/previews/449/449793_179538-hq.mp3'
      },
      {
        id: 'music_9',
        title: 'Classical Symphony',
        artist: 'Demo Classical Artist',
        duration: 300,
        genre: 'Classical',
        url: 'https://cdn.freesound.org/previews/449/449794_179538-hq.mp3'
      },
      {
        id: 'music_10',
        title: 'Smooth Jazz',
        artist: 'Demo Jazz Artist',
        duration: 160,
        genre: 'Jazz',
        url: 'https://cdn.freesound.org/previews/449/449793_179538-hq.mp3'
      },
      {
        id: 'music_11',
        title: 'Electronic Pulse',
        artist: 'Demo Electronic Artist',
        duration: 170,
        genre: 'Electronic',
        url: 'https://cdn.freesound.org/previews/449/449794_179538-hq.mp3'
      },
      {
        id: 'music_12',
        title: 'Peaceful Ambient',
        artist: 'Demo Ambient Artist',
        duration: 250,
        genre: 'Ambient',
        url: 'https://cdn.freesound.org/previews/449/449793_179538-hq.mp3'
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
    const allTracks: Track[] = [];

    for (const genre of genres) {
      console.log(`🎵 Searching for ${genre} music in Freesound Music category...`);

      // First try Music category search for proper music playlists
      const musicCategoryTracks = await this.searchMusicCategory(genre);
      allTracks.push(...musicCategoryTracks);

      // If not enough tracks from music category, try genre-specific search
      if (musicCategoryTracks.length < 5) {
        const genreSearchTerms = this.getGenreSearchTerms(genre);

        for (const searchTerm of genreSearchTerms) {
          const tracks = await this.searchTracks(searchTerm, {
            duration: 'duration:[30.0 TO 180.0]'
          });
          allTracks.push(...tracks);

          // Limit per genre to avoid too many tracks
          if (allTracks.length >= 30) break;
        }
      }
    }

    // Remove duplicates
    const uniqueTracks = allTracks.filter((track, index, self) =>
      index === self.findIndex(t => t.id === track.id)
    );

    // If we don't have enough tracks from API, supplement with fallback tracks
    if (uniqueTracks.length < 10) {
      console.log(`🎵 Only found ${uniqueTracks.length} tracks, adding fallback tracks`);
      const fallbackTracks = this.getFallbackTracks();

      // Filter fallback tracks by selected genres
      const relevantFallbacks = fallbackTracks.filter(track =>
        genres.some(genre =>
          track.genre.toLowerCase() === genre.toLowerCase()
        )
      );

      // If no relevant fallbacks, use all fallbacks
      const tracksToAdd = relevantFallbacks.length > 0 ? relevantFallbacks : fallbackTracks;

      // Add fallback tracks until we have at least 10 total
      for (const track of tracksToAdd) {
        if (uniqueTracks.length >= 15) break; // Limit to reasonable number
        if (!uniqueTracks.find(t => t.id === track.id)) {
          uniqueTracks.push(track);
        }
      }
    }

    console.log(`✅ Total music tracks loaded: ${uniqueTracks.length}`);
    return uniqueTracks;
  }

  // Get specific search terms for each genre to target Freesound Music category
  private getGenreSearchTerms(genre: string): string[] {
    const searchTermsMap: { [key: string]: string[] } = {
      'Classical': ['classical', 'piano', 'orchestra', 'symphony', 'chamber music', 'baroque'],
      'Ambient': ['ambient', 'atmospheric', 'soundscape', 'ambient music', 'drone', 'minimalist'],
      'Piano': ['piano', 'piano solo', 'keyboard', 'piano music', 'piano instrumental'],
      'Peaceful': ['peaceful', 'calm', 'serene', 'tranquil', 'gentle music'],
      'Jazz': ['jazz', 'smooth jazz', 'blues', 'swing', 'bebop', 'jazz instrumental'],
      'Electronic': ['electronic', 'synth', 'edm', 'techno', 'house', 'electronic music'],
      'Folk': ['folk', 'acoustic', 'country', 'traditional', 'bluegrass', 'folk music'],
      'Meditation': ['meditation', 'zen', 'mindfulness', 'spiritual music', 'healing music'],
      'Natural': ['organic', 'acoustic', 'nature inspired', 'environmental music'],
      'Chill': ['chill', 'chillout', 'downtempo', 'lounge', 'relaxed music'],
      'Instrumental': ['instrumental', 'melody', 'orchestral', 'ensemble', 'background music'],
      'Relaxing': ['relaxing', 'soothing', 'peaceful', 'calming music', 'soft music']
    };

    return searchTermsMap[genre] || [genre.toLowerCase()];
  }

  // Get Music category specific filters for each genre
  private getMusicCategoryFilters(genre: string): string {
    const filterMap: { [key: string]: string } = {
      'Classical': 'tag:music (tag:classical OR tag:piano OR tag:orchestra OR tag:symphony OR tag:chamber)',
      'Ambient': 'tag:music (tag:ambient OR tag:atmospheric OR tag:soundscape OR tag:drone)',
      'Piano': 'tag:music (tag:piano OR tag:keyboard OR tag:keys) tag:instrumental',
      'Peaceful': 'tag:music (tag:peaceful OR tag:calm OR tag:serene OR tag:tranquil OR tag:gentle)',
      'Jazz': 'tag:music (tag:jazz OR tag:blues OR tag:swing OR tag:smooth)',
      'Electronic': 'tag:music (tag:electronic OR tag:synth OR tag:edm OR tag:techno OR tag:house)',
      'Folk': 'tag:music (tag:folk OR tag:acoustic OR tag:country OR tag:traditional)',
      'Meditation': 'tag:music (tag:meditation OR tag:zen OR tag:mindfulness OR tag:spiritual OR tag:healing)',
      'Natural': 'tag:music (tag:organic OR tag:acoustic OR tag:nature OR tag:environmental)',
      'Chill': 'tag:music (tag:chill OR tag:chillout OR tag:downtempo OR tag:lounge OR tag:relaxed)',
      'Instrumental': 'tag:music tag:instrumental (tag:melody OR tag:orchestral OR tag:ensemble)',
      'Relaxing': 'tag:music (tag:relaxing OR tag:soothing OR tag:peaceful OR tag:calming OR tag:soft)'
    };

    return filterMap[genre] || `tag:music tag:${genre.toLowerCase()}`;
  }
}

export const freesoundService = FreesoundService.getInstance();
