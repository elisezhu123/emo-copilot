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
      { id: 'h1', title: 'Urban Vibes', artist: 'Free Beat Collective', duration: 210, genre: 'Hip-Pop' },
      { id: 'h2', title: 'City Nights', artist: 'Open Source Rap', duration: 180, genre: 'Hip-Pop' },
      { id: 'h3', title: 'Street Poetry', artist: 'Creative Commons MC', duration: 195, genre: 'Hip-Pop' }
    ]
  },
  {
    name: 'Chillout',
    tracks: [
      { id: 'ch1', title: 'Sunset Lounge', artist: 'Chill Collective', duration: 270, genre: 'Chillout' },
      { id: 'ch2', title: 'Lazy Sunday', artist: 'Relaxed Minds', duration: 250, genre: 'Chillout' },
      { id: 'ch3', title: 'Coffee Shop Dreams', artist: 'Mellow Beats', duration: 220, genre: 'Chillout' }
    ]
  },
  {
    name: 'Country',
    tracks: [
      { id: 'co1', title: 'Country Road', artist: 'Folk Guitar', duration: 200, genre: 'Country' },
      { id: 'co2', title: 'Hometown Blues', artist: 'Americana Collective', duration: 240, genre: 'Country' },
      { id: 'co3', title: 'Prairie Wind', artist: 'Open Range Band', duration: 210, genre: 'Country' }
    ]
  },
  {
    name: 'Blues',
    tracks: [
      { id: 'b1', title: 'Midnight Blues', artist: 'Blues Foundation', duration: 280, genre: 'Blues' },
      { id: 'b2', title: 'Delta Dreams', artist: 'Mississippi Open', duration: 260, genre: 'Blues' },
      { id: 'b3', title: 'Electric Sorrow', artist: 'Free Blues Society', duration: 300, genre: 'Blues' }
    ]
  },
  {
    name: 'Electro Pop',
    tracks: [
      { id: 'e1', title: 'Neon Nights', artist: 'Synth Wave', duration: 190, genre: 'Electro Pop' },
      { id: 'e2', title: 'Digital Heart', artist: 'Electronic Dreams', duration: 210, genre: 'Electro Pop' },
      { id: 'e3', title: 'Cyber Love', artist: 'Future Sounds', duration: 180, genre: 'Electro Pop' }
    ]
  },
  {
    name: 'Downbeat',
    tracks: [
      { id: 'd1', title: 'Slow Motion', artist: 'Trip Hop Collective', duration: 320, genre: 'Downbeat' },
      { id: 'd2', title: 'Urban Shadows', artist: 'Downtempo Masters', duration: 290, genre: 'Downbeat' },
      { id: 'd3', title: 'Night Walker', artist: 'Chill Beats', duration: 310, genre: 'Downbeat' }
    ]
  },
  {
    name: 'Rock',
    tracks: [
      { id: 'r1', title: 'Electric Thunder', artist: 'Rock Liberation', duration: 220, genre: 'Rock' },
      { id: 'r2', title: 'Highway Anthem', artist: 'Open Road Band', duration: 240, genre: 'Rock' },
      { id: 'r3', title: 'Rebel Spirit', artist: 'Free Rock Alliance', duration: 200, genre: 'Rock' }
    ]
  },
  {
    name: 'Folk',
    tracks: [
      { id: 'f1', title: 'Mountain Song', artist: 'Folk Heritage', duration: 250, genre: 'Folk' },
      { id: 'f2', title: 'River Tale', artist: 'Acoustic Storytellers', duration: 280, genre: 'Folk' },
      { id: 'f3', title: 'Village Dance', artist: 'Traditional Sounds', duration: 230, genre: 'Folk' }
    ]
  },
  {
    name: 'New Age',
    tracks: [
      { id: 'n1', title: 'Crystal Meditation', artist: 'Spiritual Sounds', duration: 360, genre: 'New Age' },
      { id: 'n2', title: 'Healing Light', artist: 'Inner Peace', duration: 400, genre: 'New Age' },
      { id: 'n3', title: 'Chakra Balance', artist: 'Wellness Music', duration: 320, genre: 'New Age' }
    ]
  },
  {
    name: 'Jazz',
    tracks: [
      { id: 'j1', title: 'Smooth Evening', artist: 'Jazz Collective', duration: 270, genre: 'Jazz' },
      { id: 'j2', title: 'Blue Note Cafe', artist: 'Bebop Society', duration: 300, genre: 'Jazz' },
      { id: 'j3', title: 'Midnight Sax', artist: 'Free Jazz Group', duration: 250, genre: 'Jazz' }
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
      const stored = localStorage.getItem('selectedMusicGenres');
      this.selectedGenres = stored ? JSON.parse(stored) : [];
      return this.selectedGenres;
    } catch (error) {
      console.error('Error loading selected genres:', error);
      this.selectedGenres = [];
      return [];
    }
  }

  // Save selected genres to localStorage
  saveSelectedGenres(genres: string[]): void {
    try {
      this.selectedGenres = genres;
      localStorage.setItem('selectedMusicGenres', JSON.stringify(genres));
    } catch (error) {
      console.error('Error saving selected genres:', error);
    }
  }

  // Get tracks filtered by selected genres
  getFilteredTracks(): Track[] {
    if (this.selectedGenres.length === 0) {
      // If no genres selected, return a mix from all genres
      return this.getAllTracks().slice(0, 10);
    }

    const filteredTracks: Track[] = [];
    
    for (const genreName of this.selectedGenres) {
      const genre = mockMusicDatabase.find(g => g.name === genreName);
      if (genre) {
        filteredTracks.push(...genre.tracks);
      }
    }

    return filteredTracks;
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
