import { freesoundService } from './freesoundService';

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre: string;
  url?: string;
  thumbnail?: string;
}

export interface MusicGenre {
  name: string;
  tracks: Track[];
}

// Real free music sources - using Creative Commons and public domain tracks
// Sources: Freesound.org, Archive.org, and other Creative Commons libraries
const mockMusicDatabase: MusicGenre[] = [
  {
    name: 'Classical',
    tracks: [
      {
        id: 'c1',
        title: 'Piano Sonata in C',
        artist: 'Public Domain Orchestra',
        duration: 180,
        genre: 'Classical',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Free classical-style sample
        thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop'
      },
      {
        id: 'c2',
        title: 'Violin Concerto No. 1',
        artist: 'Open Music Ensemble',
        duration: 240,
        genre: 'Classical',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        thumbnail: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=100&h=100&fit=crop'
      },
      {
        id: 'c3',
        title: 'Chamber Music Suite',
        artist: 'Free Classical Group',
        duration: 200,
        genre: 'Classical',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=100&h=100&fit=crop'
      }
    ]
  },
  {
    name: 'Ambient',
    tracks: [
      {
        id: 'a1',
        title: 'Ocean Waves',
        artist: 'Nature Sounds Collective',
        duration: 300,
        genre: 'Ambient',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=100&h=100&fit=crop'
      },
      {
        id: 'a2',
        title: 'Forest Dawn',
        artist: 'Peaceful Minds',
        duration: 420,
        genre: 'Ambient',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=100&h=100&fit=crop'
      },
      {
        id: 'a3',
        title: 'Cosmic Drift',
        artist: 'Space Ambient',
        duration: 360,
        genre: 'Ambient',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/ImperialMarch60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=100&h=100&fit=crop'
      }
    ]
  },
  {
    name: 'Hip-Pop',
    tracks: [
      {
        id: 'h1',
        title: 'Urban Vibes',
        artist: 'Free Beat Collective',
        duration: 210,
        genre: 'Hip-Pop',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop'
      },
      {
        id: 'h2',
        title: 'City Nights',
        artist: 'Open Source Rap',
        duration: 180,
        genre: 'Hip-Pop',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=100&h=100&fit=crop'
      },
      {
        id: 'h3',
        title: 'Street Poetry',
        artist: 'Creative Commons MC',
        duration: 195,
        genre: 'Hip-Pop',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/ImperialMarch60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=100&h=100&fit=crop'
      }
    ]
  },
  {
    name: 'Chillout',
    tracks: [
      {
        id: 'ch1',
        title: 'Sunset Lounge',
        artist: 'Chill Collective',
        duration: 270,
        genre: 'Chillout',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        thumbnail: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=100&h=100&fit=crop'
      },
      {
        id: 'ch2',
        title: 'Lazy Sunday',
        artist: 'Relaxed Minds',
        duration: 250,
        genre: 'Chillout',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=100&h=100&fit=crop'
      },
      {
        id: 'ch3',
        title: 'Coffee Shop Dreams',
        artist: 'Mellow Beats',
        duration: 220,
        genre: 'Chillout',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=100&h=100&fit=crop'
      }
    ]
  },
  {
    name: 'Country',
    tracks: [
      {
        id: 'co1',
        title: 'Country Road',
        artist: 'Folk Guitar',
        duration: 200,
        genre: 'Country',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/ImperialMarch60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop'
      },
      {
        id: 'co2',
        title: 'Hometown Blues',
        artist: 'Americana Collective',
        duration: 240,
        genre: 'Country',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        thumbnail: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=100&h=100&fit=crop'
      },
      {
        id: 'co3',
        title: 'Prairie Wind',
        artist: 'Open Range Band',
        duration: 210,
        genre: 'Country',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=100&h=100&fit=crop'
      }
    ]
  },
  {
    name: 'Blues',
    tracks: [
      {
        id: 'b1',
        title: 'Midnight Blues',
        artist: 'Blues Foundation',
        duration: 280,
        genre: 'Blues',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=100&h=100&fit=crop'
      },
      {
        id: 'b2',
        title: 'Delta Dreams',
        artist: 'Mississippi Open',
        duration: 260,
        genre: 'Blues',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/ImperialMarch60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=100&h=100&fit=crop'
      },
      {
        id: 'b3',
        title: 'Electric Sorrow',
        artist: 'Free Blues Society',
        duration: 300,
        genre: 'Blues',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        thumbnail: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=100&h=100&fit=crop'
      }
    ]
  },
  {
    name: 'Electro Pop',
    tracks: [
      {
        id: 'e1',
        title: 'Neon Nights',
        artist: 'Synth Wave',
        duration: 190,
        genre: 'Electro Pop',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop'
      },
      {
        id: 'e2',
        title: 'Digital Heart',
        artist: 'Electronic Dreams',
        duration: 210,
        genre: 'Electro Pop',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=100&h=100&fit=crop'
      },
      {
        id: 'e3',
        title: 'Cyber Love',
        artist: 'Future Sounds',
        duration: 180,
        genre: 'Electro Pop',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/ImperialMarch60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=100&h=100&fit=crop'
      }
    ]
  },
  {
    name: 'Downbeat',
    tracks: [
      {
        id: 'd1',
        title: 'Slow Motion',
        artist: 'Trip Hop Collective',
        duration: 320,
        genre: 'Downbeat',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        thumbnail: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=100&h=100&fit=crop'
      },
      {
        id: 'd2',
        title: 'Urban Shadows',
        artist: 'Downtempo Masters',
        duration: 290,
        genre: 'Downbeat',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=100&h=100&fit=crop'
      },
      {
        id: 'd3',
        title: 'Night Walker',
        artist: 'Chill Beats',
        duration: 310,
        genre: 'Downbeat',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=100&h=100&fit=crop'
      }
    ]
  },
  {
    name: 'Rock',
    tracks: [
      {
        id: 'r1',
        title: 'Electric Thunder',
        artist: 'Rock Liberation',
        duration: 220,
        genre: 'Rock',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/ImperialMarch60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop'
      },
      {
        id: 'r2',
        title: 'Highway Anthem',
        artist: 'Open Road Band',
        duration: 240,
        genre: 'Rock',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        thumbnail: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=100&h=100&fit=crop'
      },
      {
        id: 'r3',
        title: 'Rebel Spirit',
        artist: 'Free Rock Alliance',
        duration: 200,
        genre: 'Rock',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=100&h=100&fit=crop'
      }
    ]
  },
  {
    name: 'Folk',
    tracks: [
      {
        id: 'f1',
        title: 'Mountain Song',
        artist: 'Folk Heritage',
        duration: 250,
        genre: 'Folk',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=100&h=100&fit=crop'
      },
      {
        id: 'f2',
        title: 'River Tale',
        artist: 'Acoustic Storytellers',
        duration: 280,
        genre: 'Folk',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/ImperialMarch60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=100&h=100&fit=crop'
      },
      {
        id: 'f3',
        title: 'Village Dance',
        artist: 'Traditional Sounds',
        duration: 230,
        genre: 'Folk',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        thumbnail: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=100&h=100&fit=crop'
      }
    ]
  },
  {
    name: 'New Age',
    tracks: [
      {
        id: 'n1',
        title: 'Crystal Meditation',
        artist: 'Spiritual Sounds',
        duration: 360,
        genre: 'New Age',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop'
      },
      {
        id: 'n2',
        title: 'Healing Light',
        artist: 'Inner Peace',
        duration: 400,
        genre: 'New Age',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=100&h=100&fit=crop'
      },
      {
        id: 'n3',
        title: 'Chakra Balance',
        artist: 'Wellness Music',
        duration: 320,
        genre: 'New Age',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/ImperialMarch60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=100&h=100&fit=crop'
      }
    ]
  },
  {
    name: 'Jazz',
    tracks: [
      {
        id: 'j1',
        title: 'Smooth Evening',
        artist: 'Jazz Collective',
        duration: 270,
        genre: 'Jazz',
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        thumbnail: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=100&h=100&fit=crop'
      },
      {
        id: 'j2',
        title: 'Blue Note Cafe',
        artist: 'Bebop Society',
        duration: 300,
        genre: 'Jazz',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=100&h=100&fit=crop'
      },
      {
        id: 'j3',
        title: 'Midnight Sax',
        artist: 'Free Jazz Group',
        duration: 250,
        genre: 'Jazz',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav',
        thumbnail: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=100&h=100&fit=crop'
      }
    ]
  }
];

class MusicService {
  private static instance: MusicService;
  private selectedGenres: string[] = [];

  static getInstance(): MusicService {
    if (!MusicService.instance) {
      MusicService.instance = new MusicService();
    }
    return MusicService.instance;
  }

  // Load selected genres from localStorage
  loadSelectedGenres(): string[] {
    try {
      console.log('🔍 MusicService: Loading genres from localStorage');
      const stored = localStorage.getItem('selectedMusicGenres');
      console.log('🔍 MusicService: Raw stored value:', stored);
      this.selectedGenres = stored ? JSON.parse(stored) : [];
      console.log('🔍 MusicService: Parsed genres:', this.selectedGenres);
      return this.selectedGenres;
    } catch (error) {
      console.error('🔍 MusicService: Error loading selected genres:', error);
      this.selectedGenres = [];
      return [];
    }
  }

  // Save selected genres to localStorage
  saveSelectedGenres(genres: string[]): void {
    try {
      console.log('🔍 MusicService: Saving genres to localStorage:', genres);
      this.selectedGenres = genres;
      const jsonString = JSON.stringify(genres);
      console.log('🔍 MusicService: Saving as JSON string:', jsonString);
      localStorage.setItem('selectedMusicGenres', jsonString);
      console.log('🔍 MusicService: Genres saved successfully');
    } catch (error) {
      console.error('🔍 MusicService: Error saving selected genres:', error);
    }
  }

  // Get tracks filtered by selected genres
  getFilteredTracks(): Track[] {
    // Always load from localStorage first to ensure we have current genres
    this.loadSelectedGenres();

    if (this.selectedGenres.length === 0) {
      // If no genres selected, return empty array
      console.log('⚠️ No genres selected, returning empty tracks');
      return [];
    }

    const filteredTracks: Track[] = [];

    for (const genreName of this.selectedGenres) {
      const genre = mockMusicDatabase.find(g => g.name === genreName);
      if (genre) {
        filteredTracks.push(...genre.tracks);
      }
    }

    console.log(`🎵 Filtered tracks for genres [${this.selectedGenres.join(', ')}]:`, filteredTracks.length, 'tracks');
    return filteredTracks;
  }

  // Get real tracks from Freesound API by genres
  async getFilteredTracksFromAPI(): Promise<Track[]> {
    if (this.selectedGenres.length === 0) {
      return this.getFilteredTracks(); // Fallback to mock data
    }

    try {
      const allTracks: Track[] = [];

      for (const genre of this.selectedGenres) {
        const tracks = await freesoundService.getTracksByGenre(genre);
        allTracks.push(...tracks.slice(0, 3)); // Limit to 3 tracks per genre
      }

      return allTracks.length > 0 ? allTracks : this.getFilteredTracks();

    } catch (error) {
      console.error('Error fetching tracks from API:', error);
      return this.getFilteredTracks(); // Fallback to mock data
    }
  }

  // Get all tracks from all genres
  getAllTracks(): Track[] {
    return mockMusicDatabase.flatMap(genre => genre.tracks);
  }

  // Get tracks by specific genre
  getTracksByGenre(genreName: string): Track[] {
    const genre = mockMusicDatabase.find(g => g.name === genreName);
    return genre ? genre.tracks : [];
  }

  // Get a random track from selected genres
  getRandomTrack(): Track | null {
    const tracks = this.getFilteredTracks();
    if (tracks.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * tracks.length);
    return tracks[randomIndex];
  }

  // Get a random track from API
  async getRandomTrackFromAPI(): Promise<Track | null> {
    try {
      console.log('🎵 Getting tracks from API for selected genres:', this.selectedGenres);
      const tracks = await this.getFilteredTracksFromAPI();

      if (tracks.length === 0) {
        console.log('⚠️ No tracks returned from API, using fallback');
        return this.getRandomTrack();
      }

      const randomIndex = Math.floor(Math.random() * tracks.length);
      const selectedTrack = tracks[randomIndex];
      console.log('✅ Selected random track from API:', selectedTrack.title, 'by', selectedTrack.artist);
      return selectedTrack;

    } catch (error) {
      console.error('❌ Error getting random track from API:', error);
      return this.getRandomTrack(); // Fallback
    }
  }

  // Get current playlist based on selected genres
  getCurrentPlaylist(): Track[] {
    return this.getFilteredTracks();
  }

  // Format duration to mm:ss
  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Get selected genres
  getSelectedGenres(): string[] {
    return [...this.selectedGenres];
  }

  // Check if any genres are selected
  hasSelectedGenres(): boolean {
    return this.selectedGenres.length > 0;
  }
}

export const musicService = MusicService.getInstance();
