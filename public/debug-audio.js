// Debug script for testing audio functionality
// Paste this into the browser console to test step by step

console.log('🎵 Starting audio debug test...');

// Step 1: Test basic audio functionality
async function testBasicAudio() {
  console.log('1. Testing basic audio functionality...');
  if (typeof window.audioManager !== 'undefined') {
    const result = await window.audioManager.testAudio();
    console.log('Basic audio test result:', result);
    return result;
  } else {
    console.error('❌ audioManager not found in window');
    console.log('💡 Try refreshing the page to ensure audioManager is loaded');
    return false;
  }
}

// Step 2: Test Freesound API
async function testFreesoundAPI() {
  console.log('2. Testing Freesound API...');
  try {
    const response = await fetch('https://freesound.org/apiv2/search/text/?query=music&token=42lrzapXiOWxaFu4G6FWhuy9bGgb4rnBOqJuOypA&format=json&fields=id,name,previews&page_size=3');
    const data = await response.json();
    console.log('✅ Freesound API working, tracks found:', data.results.length);
    console.log('Sample track URLs:', data.results.map(r => r.previews['preview-hq-mp3']));
    return data.results;
  } catch (error) {
    console.error('❌ Freesound API error:', error);
    return [];
  }
}

// Step 3: Test playing a Freesound track
async function testFreesoundPlayback() {
  console.log('3. Testing Freesound track playback...');
  const tracks = await testFreesoundAPI();
  if (tracks.length > 0 && typeof window.audioManager !== 'undefined') {
    const testTrack = {
      id: `test_${tracks[0].id}`,
      title: tracks[0].name,
      artist: 'Test Artist',
      duration: 30,
      genre: 'test',
      url: tracks[0].previews['preview-hq-mp3']
    };
    
    console.log('Playing test track:', testTrack);
    try {
      await window.audioManager.playTrack(testTrack);
      console.log('✅ Track playback started successfully');
      return true;
    } catch (error) {
      console.error('❌ Track playback failed:', error);
      return false;
    }
  }
  return false;
}

// Step 4: Check audio state
function checkAudioState() {
  console.log('4. Checking audio state...');
  if (typeof window.audioManager !== 'undefined') {
    const state = window.audioManager.getState();
    console.log('Audio state:', state);
    return state;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running complete audio debug test suite...');
  
  const basicTest = await testBasicAudio();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  
  const freesoundTest = await testFreesoundPlayback();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  
  const audioState = checkAudioState();
  
  console.log('📊 Test Summary:');
  console.log('- Basic audio:', basicTest ? '✅' : '❌');
  console.log('- Freesound playback:', freesoundTest ? '✅' : '❌');
  console.log('- Current state:', audioState);
  
  if (!basicTest) {
    console.log('💡 Basic audio failed - check browser audio permissions and user interaction requirements');
  }
  if (!freesoundTest) {
    console.log('💡 Freesound playback failed - check network connectivity and CORS');
  }
}

// Export functions to window for manual testing
window.testBasicAudio = testBasicAudio;
window.testFreesoundAPI = testFreesoundAPI;
window.testFreesoundPlayback = testFreesoundPlayback;
window.checkAudioState = checkAudioState;
window.runAllTests = runAllTests;

console.log('🎵 Debug functions ready! Run runAllTests() or test individually:');
console.log('- testBasicAudio()');
console.log('- testFreesoundAPI()'); 
console.log('- testFreesoundPlayback()');
console.log('- checkAudioState()');
console.log('- runAllTests()');
