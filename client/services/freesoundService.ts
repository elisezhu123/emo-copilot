import { Track } from './musicService';

// Free Music Archive tracks - direct links to Creative Commons music
class FreeArchiveService {
  private static instance: FreeArchiveService;

  static getInstance(): FreeArchiveService {
    if (!FreeArchiveService.instance) {
      FreeArchiveService.instance = new FreeArchiveService();
    }
    return FreeArchiveService.instance;
  }

  // Get tracks by specific genre from Free Music Archive
  async getTracksByGenre(genre: string): Promise<Track[]> {
    console.log('🎵 Getting Free Music Archive tracks for genre:', genre);

    const freeArchiveTracks: { [key: string]: Track[] } = {
      'Classical': [
        {
          id: 'fma_c1',
          title: 'Moonlight Sonata',
          artist: 'Kevin MacLeod',
          duration: 180,
          genre: 'Classical',
          url: 'https://freemusicarchive.org/track/moonlight-sonata/download'
        },
        {
          id: 'fma_c2',
          title: 'Canon in D',
          artist: 'Public Domain',
          duration: 240,
          genre: 'Classical',
          url: 'https://archive.org/download/CanonInD_201407/Canon%20in%20D.mp3'
        }
      ],
      'Ambient': [
        {
          id: 'fma_a1',
          title: 'Deep Space',
          artist: 'Kevin MacLeod',
          duration: 300,
          genre: 'Ambient',
          url: 'https://archive.org/download/Kevin_MacLeod_-_Laid_Back_Guitars/Kevin_MacLeod_-_03_-_Laid_Back_Guitars.mp3'
        },
        {
          id: 'fma_a2',
          title: 'Meditation',
          artist: 'Free Music Archive',
          duration: 420,
          genre: 'Ambient',
          url: 'https://archive.org/download/TenTimes-LookingBackward/Ten%20Times%20-%2002%20-%20Looking%20Backward.mp3'
        }
      ],
      'Chillout': [
        {
          id: 'fma_ch1',
          title: 'Relaxing Vibes',
          artist: 'Lofi Hip Hop',
          duration: 180,
          genre: 'Chillout',
          url: 'https://archive.org/download/LoFiHipHopBeat1/LoFi%20Hip%20Hop%20Beat%201.mp3'
        }
      ],
      'Electronic': [
        {
          id: 'fma_e1',
          title: 'Digital Dreams',
          artist: 'Kevin MacLeod',
          duration: 210,
          genre: 'Electronic',
          url: 'https://archive.org/download/Kevin_MacLeod_-_Arcadia/Kevin_MacLeod_-_01_-_Arcadia.mp3'
        }
      ],
      'Jazz': [
        {
          id: 'fma_j1',
          title: 'Smooth Jazz',
          artist: 'Free Jazz Collective',
          duration: 240,
          genre: 'Jazz',
          url: 'https://archive.org/download/JazzMe_Blues_1611/Jazz_Me_Blues.mp3'
        }
      ]
    };

    const tracks = freeArchiveTracks[genre] || freeArchiveTracks['Ambient'];
    console.log(`✅ Found ${tracks.length} Free Archive tracks for ${genre}`);
    
    return tracks;
  }

  // Search for tracks by query
  async searchTracks(query: string, genre?: string): Promise<Track[]> {
    // For simplicity, just return tracks by genre
    return this.getTracksByGenre(genre || 'Ambient');
  }

  // Check if API is configured (always true for Free Archive)
  isConfigured(): boolean {
    return true;
  }

  // Get API status
  getApiStatus(): string {
    return '🎵 Free Music Archive - Creative Commons music ready to play';
  }
}

export const freesoundService = FreeArchiveService.getInstance();
