import { Recastra } from '../src';

/**
 * Basic usage example for Recastra
 * 
 * This example demonstrates how to:
 * 1. Initialize the recorder
 * 2. Start recording
 * 3. Stop recording and get the blob
 * 4. Save the recording to disk
 */
async function basicRecordingExample() {
  // Create a new Recastra instance
  const recorder = new Recastra();
  
  try {
    // Initialize with custom video and audio constraints
    await recorder.init({
      video: { width: 1280, height: 720 }, // 720p video
      audio: { deviceId: 'default' }       // Default microphone
    });
    
    console.log('Recorder initialized successfully');
    
    // Set the MIME type for the recording
    recorder.setMimeType('video/webm');
    
    // Start recording
    console.log('Starting recording...');
    recorder.start();
    
    // Record for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Stop recording and get the blob
    console.log('Stopping recording...');
    const blob = await recorder.stop();
    
    console.log(`Recording completed: ${blob.size} bytes`);
    
    // Save the recording to disk
    recorder.save('my-recording.webm');
    
    // Clean up resources
    recorder.dispose();
    
  } catch (error) {
    console.error('Error during recording:', error);
  }
}

/**
 * Example of updating the stream during recording
 */
async function updateStreamExample() {
  const recorder = new Recastra();
  
  try {
    // Initialize with audio only
    await recorder.init({ audio: true, video: false });
    console.log('Initialized with audio only');
    
    // Start recording
    recorder.start();
    console.log('Started recording audio');
    
    // Record for 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update to include video
    await recorder.updateStream({ audio: true, video: true });
    console.log('Updated stream to include video');
    
    // Record for 3 more seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Stop and save
    const blob = await recorder.stop();
    recorder.save('updated-stream-recording.webm');
    
    console.log(`Recording completed: ${blob.size} bytes`);
    recorder.dispose();
    
  } catch (error) {
    console.error('Error during recording:', error);
  }
}

/**
 * Example of uploading a recording to a server
 */
async function uploadExample() {
  const recorder = new Recastra();
  
  try {
    await recorder.init({ audio: true, video: true });
    recorder.start();
    
    // Record for 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const blob = await recorder.stop();
    
    // Upload to a server
    console.log('Uploading recording...');
    const response = await recorder.upload('https://example.com/upload', 'recording');
    
    if (response.ok) {
      console.log('Upload successful!');
    } else {
      console.error('Upload failed:', response.statusText);
    }
    
    recorder.dispose();
    
  } catch (error) {
    console.error('Error during recording or upload:', error);
  }
}

// Run the examples
// Note: In a real application, you would typically call these functions
// in response to user actions (button clicks, etc.)
// basicRecordingExample();
// updateStreamExample();
// uploadExample();

export { basicRecordingExample, updateStreamExample, uploadExample };