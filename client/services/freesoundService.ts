import { Track } from './musicService';

export interface FreesoundTrack {
  id: number;
  name: string;
  description: string;
  tags: string[];
  license: string;
  username: string;
  duration: number;
  previews: {
    'preview-lq-mp3': string;
    'preview-hq-mp3': string;
    'preview-lq-ogg': string;
    'preview-hq-ogg': string;
  };
  images: {
    waveform_m: string;
    spectral_m: string;
  };
}

class FreesoundService {
  private static instance: FreesoundService;
  private readonly API_KEY = import.meta.env.VITE_FREESOUND_API_KEY || 'demo';
  private readonly BASE_URL = 'https://freesound.org/apiv2';

  static getInstance(): FreesoundService {
    if (!FreesoundService.instance) {
      FreesoundService.instance = new FreesoundService();
    }
    return FreesoundService.instance;
  }

  // Search for tracks by genre/tags
  async searchTracks(query: string, genre?: string): Promise<Track[]> {
    try {
      // Build search query
      let searchQuery = query;
      if (genre) {
        searchQuery += ` tag:${genre.toLowerCase()}`;
      }

      const url = new URL(`${this.BASE_URL}/search/text/`);
      url.searchParams.append('query', searchQuery);
      url.searchParams.append('token', this.API_KEY);
      url.searchParams.append('format', 'json');
      url.searchParams.append('fields', 'id,name,description,tags,license,username,duration,previews,images');
      url.searchParams.append('page_size', '20');
      url.searchParams.append('filter', 'duration:[10.0 TO 300.0]'); // 10 seconds to 5 minutes

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Freesound API key not configured, using fallback tracks');
          return this.getFallbackTracks(genre || 'music');
        }
        throw new Error(`Freesound API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.results.map((track: FreesoundTrack) => this.convertToTrack(track, genre));
      
    } catch (error) {
      console.error('Error fetching from Freesound:', error);
      return this.getFallbackTracks(genre || 'music');
    }
  }

  // Convert Freesound track to our Track interface
  private convertToTrack(freesoundTrack: FreesoundTrack, genre?: string): Track {
    return {
      id: `fs_${freesoundTrack.id}`,
      title: freesoundTrack.name,
      artist: freesoundTrack.username,
      duration: Math.round(freesoundTrack.duration),
      genre: genre || this.guessGenreFromTags(freesoundTrack.tags),
      url: freesoundTrack.previews['preview-hq-mp3'] || freesoundTrack.previews['preview-lq-mp3'],
      thumbnail: freesoundTrack.images?.waveform_m
    };
  }

  // Guess genre from tags
  private guessGenreFromTags(tags: string[]): string {
    const genreMap: { [key: string]: string[] } = {
      'Classical': ['classical', 'piano', 'violin', 'orchestra', 'symphony'],
      'Ambient': ['ambient', 'atmospheric', 'pad', 'drone', 'meditation'],
      'Electronic': ['electronic', 'synth', 'techno', 'edm', 'digital'],
      'Rock': ['rock', 'guitar', 'drums', 'band', 'electric'],
      'Jazz': ['jazz', 'saxophone', 'swing', 'blues', 'improvisation'],
      'Hip-Hop': ['hip-hop', 'rap', 'beat', 'urban', 'rhythmic'],
      'Folk': ['folk', 'acoustic', 'traditional', 'country', 'bluegrass'],
      'Pop': ['pop', 'catchy', 'commercial', 'mainstream'],
    };

    const lowerTags = tags.map(tag => tag.toLowerCase());
    
    for (const [genre, keywords] of Object.entries(genreMap)) {
      if (keywords.some(keyword => lowerTags.includes(keyword))) {
        return genre;
      }
    }

    return 'Unknown';
  }

  // Get fallback tracks when API is not available
  private getFallbackTracks(genre: string): Track[] {
    const fallbackTracks: { [key: string]: Track[] } = {
      'Classical': [
        {
          id: 'fb_c1',
          title: 'Bach Invention No. 1',
          artist: 'Public Domain',
          duration: 120,
          genre: 'Classical',
          url: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav'
        }
      ],
      'Ambient': [
        {
          id: 'fb_a1',
          title: 'Nature Sounds',
          artist: 'Ambient Collective',
          duration: 180,
          genre: 'Ambient',
          url: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav'
        }
      ],
      'Electronic': [
        {
          id: 'fb_e1',
          title: 'Synth Wave',
          artist: 'Electronic Artist',
          duration: 150,
          genre: 'Electronic',
          url: 'https://www2.cs.uic.edu/~i101/SoundFiles/ImperialMarch60.wav'
        }
      ]
    };

    return fallbackTracks[genre] || fallbackTracks['Ambient'];
  }

  // Get tracks by specific genre
  async getTracksByGenre(genre: string): Promise<Track[]> {
    const genreQueries: { [key: string]: string } = {
      'Classical': 'classical piano violin orchestra',
      'Ambient': 'ambient atmospheric meditation peaceful',
      'Hip-Pop': 'hip hop beat urban rap',
      'Chillout': 'chill lounge relaxing downtempo',
      'Country': 'country folk acoustic guitar',
      'Blues': 'blues guitar harmonica',
      'Electro Pop': 'electronic pop synth dance',
      'Downbeat': 'downtempo trip hop chill',
      'Rock': 'rock guitar drums band',
      'Folk': 'folk acoustic traditional',
      'New Age': 'new age meditation spiritual',
      'Jazz': 'jazz saxophone piano swing'
    };

    const query = genreQueries[genre] || genre.toLowerCase();
    return this.searchTracks(query, genre);
  }

  // Check if API is configured
  isConfigured(): boolean {
    return this.API_KEY !== 'demo' && this.API_KEY.length > 10;
  }

  // Get API status
  getApiStatus(): string {
    if (this.isConfigured()) {
      return 'Freesound API configured - using real audio tracks';
    } else {
      return 'Using demo tracks - configure VITE_FREESOUND_API_KEY for real audio';
    }
  }
}

export const freesoundService = FreesoundService.getInstance();
