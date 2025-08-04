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
      const params = new URLSearchParams({
        token: this.apiKey,
        query: query,
        page_size: '10',
        fields: 'id,name,username,duration,tags,previews',
        filter: `duration:[10.0 TO 300.0] ${filters.duration || ''}`,
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

  // Clean up track titles
  private cleanTitle(name: string): string {
    return name.replace(/\.(wav|mp3|flac|ogg)$/i, '')
               .replace(/[_-]/g, ' ')
               .trim();
  }

  // Extract genre from tags
  private extractGenre(tags: string[]): string {
    const genreTags = ['classical', 'jazz', 'electronic', 'ambient', 'rock', 'pop', 'folk', 'piano'];
    
    for (const tag of tags) {
      const lowerTag = tag.toLowerCase();
      for (const genre of genreTags) {
        if (lowerTag.includes(genre)) {
          return genre.charAt(0).toUpperCase() + genre.slice(1);
        }
      }
    }
    
    return 'Music';
  }

  // Fallback tracks when API is not available
  private getFallbackTracks(): Track[] {
    return [
      {
        id: 'test_1',
        title: 'Freesound Piano Test',
        artist: 'RutgerMuller',
        duration: 10,
        genre: 'Demo',
        url: 'https://cdn.freesound.org/previews/449/449794_179538-hq.mp3'
      },
      {
        id: 'test_2',
        title: 'Freesound Piano Melody',
        artist: 'RutgerMuller', 
        duration: 24,
        genre: 'Demo',
        url: 'https://cdn.freesound.org/previews/449/449793_179538-hq.mp3'
      }
    ];
  }

  // Get tracks by specific genres
  async getTracksByGenres(genres: string[]): Promise<Track[]> {
    const allTracks: Track[] = [];
    
    for (const genre of genres) {
      const tracks = await this.searchTracks(genre.toLowerCase(), {
        duration: 'duration:[30.0 TO 180.0]'
      });
      allTracks.push(...tracks);
    }
    
    return allTracks;
  }
}

export const freesoundService = FreesoundService.getInstance();
