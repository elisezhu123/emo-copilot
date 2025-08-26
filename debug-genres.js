// Debug script to test Rock and Blues genre loading
// Run this in browser console on the music playlists page

console.log('🔍 Testing Rock and Blues genres...');

// Test simpleMusicService fallback tracks
function testFallbackTracks() {
  console.log('Testing fallback tracks...');
  
  // Import the service (this is just for testing structure)
  const mockFallbackTracks = [
    { id: 'fallback_rock_1', title: 'Electric Power', artist: 'Rock Demo', duration: 200, genre: 'Rock', url: 'test' },
    { id: 'fallback_rock_2', title: 'Guitar Anthem', artist: 'Rock Band Demo', duration: 190, genre: 'Rock', url: 'test' },
    { id: 'fallback_blues_1', title: 'Midnight Blues', artist: 'Blues Demo', duration: 220, genre: 'Blues', url: 'test' },
    { id: 'fallback_blues_2', title: 'Delta Sounds', artist: 'Blues Heritage Demo', duration: 240, genre: 'Blues', url: 'test' }
  ];
  
  // Test genre filtering
  const rockTracks = mockFallbackTracks.filter(track => 
    track.genre.toLowerCase() === 'rock'.toLowerCase()
  );
  const bluesTracks = mockFallbackTracks.filter(track => 
    track.genre.toLowerCase() === 'blues'.toLowerCase()
  );
  
  console.log('Rock tracks found:', rockTracks.length);
  console.log('Blues tracks found:', bluesTracks.length);
  console.log('Rock tracks:', rockTracks);
  console.log('Blues tracks:', bluesTracks);
}

// Test localStorage
function testLocalStorage() {
  console.log('Testing localStorage...');
  
  // Test saving Rock
  localStorage.setItem('selectedMusicGenres', JSON.stringify(['Rock']));
  const savedRock = JSON.parse(localStorage.getItem('selectedMusicGenres') || '[]');
  console.log('Saved Rock genre:', savedRock);
  
  // Test saving Blues
  localStorage.setItem('selectedMusicGenres', JSON.stringify(['Blues']));
  const savedBlues = JSON.parse(localStorage.getItem('selectedMusicGenres') || '[]');
  console.log('Saved Blues genre:', savedBlues);
  
  // Test saving both
  localStorage.setItem('selectedMusicGenres', JSON.stringify(['Rock', 'Blues']));
  const savedBoth = JSON.parse(localStorage.getItem('selectedMusicGenres') || '[]');
  console.log('Saved both genres:', savedBoth);
}

// Run tests
testFallbackTracks();
testLocalStorage();

console.log('🔍 Debug tests complete. Check the output above.');
