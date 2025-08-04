import { Track } from './musicService';

// Pixabay API service for royalty-free music
class PixabayMusicService {
  private static instance: PixabayMusicService;
  private apiKey: string;
  private baseUrl = 'https://pixabay.com/api/';

  static getInstance(): PixabayMusicService {
    if (!PixabayMusicService.instance) {
      PixabayMusicService.instance = new PixabayMusicService();
    }
    return PixabayMusicService.instance;
  }

  constructor() {
    this.apiKey = import.meta.env.VITE_PIXABAY_API_KEY || '';
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  // Search for music tracks
  async searchMusic(query: string = 'relaxing', category: string = 'music'): Promise<Track[]> {
    if (!this.isConfigured()) {
      console.warn('Pixabay API key not configured');
      return this.getFallbackTracks();
    }

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        q: query,
        category: category,
        audio_type: 'music',
        min_duration: '30',
        per_page: '10',
        order: 'popular'
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Pixabay API error: ${response.status}`);
      }

      const data = await response.json();
      
      return this.convertToTracks(data.hits || []);
    } catch (error) {
      console.error('Error fetching from Pixabay:', error);
      return this.getFallbackTracks();
    }
  }

  // Convert Pixabay data to our Track format
  private convertToTracks(pixabayTracks: any[]): Track[] {
    return pixabayTracks.map((track, index) => ({
      id: `pixabay_${track.id}`,
      title: track.tags?.split(',')[0]?.trim() || `Track ${index + 1}`,
      artist: track.user || 'Pixabay Music',
      duration: track.duration || 60,
      genre: this.extractGenre(track.tags || ''),
      url: track.webformatURL || track.download_url || ''
    }));
  }

  private extractGenre(tags: string): string {
    const genreTags = ['jazz', 'classical', 'electronic', 'ambient', 'rock', 'pop', 'folk'];
    const tagList = tags.toLowerCase().split(',');
    
    for (const genre of genreTags) {
      if (tagList.some(tag => tag.includes(genre))) {
        return genre.charAt(0).toUpperCase() + genre.slice(1);
      }
    }
    
    return 'Music';
  }

  // Fallback tracks if API fails
  private getFallbackTracks(): Track[] {
    return [
      {
        id: 'fallback_1',
        title: 'Peaceful Piano',
        artist: 'Demo Music',
        duration: 120,
        genre: 'Classical',
        url: 'https://www.w3schools.com/html/horse.mp3'
      },
      {
        id: 'fallback_2',
        title: 'Ambient Sounds',
        artist: 'Demo Music',
        duration: 180,
        genre: 'Ambient',
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3'
      }
    ];
  }

  // Get random tracks from popular categories
  async getRandomTracks(): Promise<Track[]> {
    const queries = ['relaxing', 'ambient', 'piano', 'peaceful', 'meditation'];
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    return this.searchMusic(randomQuery);
  }

  // Get tracks by mood/genre
  async getTracksByMood(mood: string): Promise<Track[]> {
    return this.searchMusic(mood);
  }
}

export const pixabayMusicService = PixabayMusicService.getInstance();
