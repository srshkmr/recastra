# Recastra

**Recastra** is a lightweight TypeScript plugin that uses WebRTC to record audio and video from the user's device directly in the browser. Designed for ease of integration and modern browser compatibility.

---

## 📦 Installation

```bash
npm install recastra
# or
yarn add recastra
```

---

## ⚡ Quick Start

```ts
import { Recastra } from 'recastra';

const recorder = new Recastra();

await recorder.init({
  video: { width: 1280, height: 720 }, // Choose resolution
  audio: { deviceId: 'default' }       // Choose specific microphone
});

recorder.setMimeType('video/webm'); // Set MIME type

recorder.start();      // Starts recording

// ...after some time
const blob = await recorder.stop(); // Stops and returns the recording Blob

// You can now download or upload the blob
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'recording.webm';
a.click();
```

---

## ✨ Features

### Recording Capabilities
- 🎙️ Record audio and video using WebRTC
- 🎙️ Audio-only recording mode for voice recordings with high-quality audio capture
- 🔊 Adjustable audio volume boosting for clearer recordings
- 🎥 Supports camera and microphone access
- 📐 Choose video resolution (e.g., 720p, 1080p)
- 🔄 Seamless recording continuity when input source changes
- 🧭 Adjustable recording duration and intervals
- 🧬 Multi-stream (record multiple tracks simultaneously)
- 🔧 Configurable recorder options (bitrate, codecs, etc.)

### Device Support
- 🎚️ Select input devices: microphone and camera
- 🔍 Enumerate available audio and video devices
- 🔄 Switch between different microphones without stopping video
- 🔄 Switch between different cameras during recording
- 🌐 Cross-browser support (Chrome, Firefox, Edge)
- 🍏 Safari compatibility (with WebKit-specific constraints)
- 🧩 Works with canvas and screen streams (e.g., screen sharing, canvas recording)

### Export Options
- 💾 Export video recordings as `webm` or `mp4`
- 💾 Export audio recordings as `wav` or `mp3`
- 🔊 Extract audio-only from video recordings
- 🧾 Set MIME type for recording (e.g., `video/webm`, `audio/wav`)
- 📁 Save to disk or upload to server

### Advanced Features
- ⚡ Easily embeddable into any web project
- 🔄 Dynamic stream updates without stopping recording
- 🧱 Written in TypeScript for type safety

---

## 🛠 API

### Constructor Options

```typescript
interface RecastraOptions {
  mimeType?: string;              // MIME type for recording (e.g., 'video/webm', 'audio/webm')
  recordingOptions?: MediaRecorderOptions;  // Options for MediaRecorder
  audioOnly?: boolean;            // Whether to record audio only (no video)
  audioGain?: number;             // Audio gain level for volume boosting (1.0 is normal, higher values boost volume)
}
```

The library automatically sets optimal defaults for audio recording, including:
- Default audioBitsPerSecond of 128000 for high-quality audio
- Frequent data collection (every 100ms) during recording for continuous audio capture
- Enhanced audio quality settings for audio-only recordings (48kHz sample rate, 2 channels)
- Optimized audio constraints (echoCancellation, noiseSuppression, autoGainControl)
- Audio volume boosting (2.0x by default) for clearer recordings
- Web Audio API processing for high-fidelity sound
- Robust error handling and recovery mechanisms to prevent audio breakage

### `constructor(options?: RecastraOptions)`
Creates a new Recastra instance with optional configuration.

```typescript
// Audio-only recorder
const audioRecorder = new Recastra({ audioOnly: true });

// Video recorder with specific MIME type and options
const videoRecorder = new Recastra({
  mimeType: 'video/webm;codecs=vp9',
  recordingOptions: { audioBitsPerSecond: 128000, videoBitsPerSecond: 2500000 }
});

// Recorder with boosted audio volume (2x normal volume)
const loudRecorder = new Recastra({
  audioGain: 2.0,
  recordingOptions: { audioBitsPerSecond: 128000 }
});
```

### `init(): Promise<void>`
Requests camera and microphone access from the user with optimized default settings.

### `init(constraints?: MediaStreamConstraints): Promise<void>`
Initializes the stream with custom audio/video constraints (e.g., resolution, device selection). 

Features:
- Uses optimized audio settings based on recording type:
  - For audio-only: 48kHz sample rate, 2 channels, with noise suppression
  - For video: 44.1kHz sample rate, 2 channels, with standard processing
- Automatically applies essential audio processing (echoCancellation, noiseSuppression, autoGainControl)
- Includes timeout protection to prevent hanging if permissions aren't granted
- Provides detailed error reporting for troubleshooting

### `getAudioDevices(): Promise<MediaDeviceInfo[]>`
Returns a list of available audio input devices. Useful for letting users select a specific microphone.

```typescript
const audioDevices = await recorder.getAudioDevices();
console.log('Available microphones:', audioDevices);
```

### `getVideoDevices(): Promise<MediaDeviceInfo[]>`
Returns a list of available video input devices. Useful for letting users select a specific camera.

```typescript
const videoDevices = await recorder.getVideoDevices();
console.log('Available cameras:', videoDevices);
```

### `setMimeType(type: string): void`
Sets the MIME type to be used for recording (e.g., `video/webm`, `audio/webm`, `audio/wav`).

### `setAudioGain(gain: number): Promise<void>`
Sets the audio gain level for volume boosting. Values between 1.0 and 3.0 are recommended.

```typescript
// Boost audio volume by 2x
await recorder.setAudioGain(2.0);

// Reset to normal volume
await recorder.setAudioGain(1.0);
```

Features:
- Dynamically adjusts volume during recording without stopping
- Uses Web Audio API for high-quality audio processing
- Applies changes immediately to active recordings
- Provides real-time volume control for better audio quality

### `start(): void`
Begins recording the available streams with optimized settings for continuous audio capture.

Features:
- Uses a 100ms timeslice interval for frequent data collection to prevent audio gaps
- Implements a heartbeat mechanism to detect and recover from stalled recordings
- Provides automatic recovery from MediaRecorder errors with intelligent restart
- Includes comprehensive error handling with detailed diagnostics
- Optimizes recording settings based on content type (audio-only vs. video)
- Monitors recording health continuously to prevent interruptions

### `stop(): Promise<Blob>`
Stops the recording and returns a `Blob` of the media with enhanced reliability.

Features:
- Requests a final data chunk before stopping to ensure all audio is captured
- Includes timeout protection to prevent hanging if MediaRecorder fails to stop
- Provides comprehensive error handling with detailed error messages
- Validates recording data before creating the final blob

### `updateStream(constraints: MediaStreamConstraints, maintainVideo?: boolean): Promise<void>`
Dynamically updates the recording stream with new audio/video constraints with enhanced continuity. The `maintainVideo` parameter (default: true) controls whether to maintain the video stream when changing audio inputs.

Features:
- Preserves recording continuity by maintaining previous audio chunks when switching sources
- Properly removes existing audio tracks before adding new ones to prevent conflicts
- Ensures explicit audio quality settings are applied when changing audio sources
- Includes stabilization delays to ensure smooth transitions between audio sources
- Provides comprehensive error handling with detailed error messages

```typescript
// Update just the audio source without stopping video
await recorder.updateStream({ 
  audio: { deviceId: { exact: 'new-microphone-id' } },
  video: true
});

// Completely replace both audio and video
await recorder.updateStream({
  audio: { deviceId: { exact: 'new-microphone-id' } },
  video: { deviceId: { exact: 'new-camera-id' } }
}, false);
```

### `getStream(): MediaStream`
Returns the current active MediaStream being used for recording.

### `pause(): void`
Pauses the recording session.

### `resume(): void`
Resumes a paused recording session.

### `save(fileName?: string): Blob`
Downloads the recording using a generated blob URL and returns the recording blob. Optionally specify a file name.

Features:
- Automatically selects the appropriate file extension based on recording type (audio or video)
- Uses common audio extensions (mp3, wav, ogg) for audio-only recordings
- Uses video extensions (webm, mp4, ogg) for video recordings
- Ensures consistent file format for playback in various media players
- Returns the recording blob for further processing

```typescript
// Save recording and get the blob for further processing
const blob = recorder.save('recording.webm');
```

### `saveAsAudio(fileName?: string): Blob`
Downloads the recording as audio only, regardless of whether video was recorded, with enhanced format support and reliability. Returns the audio blob.

Features:
- Always uses WAV format for audio downloads for maximum compatibility and quality
- Intelligently determines the appropriate file extension based on the selected format
- Uses common audio extensions (mp3, wav, ogg) for better compatibility with media players
- Maps MIME types to appropriate file extensions (audio/mp4 → mp3, audio/mpeg → mp3)
- Provides fallback mechanisms if chunks aren't available
- Includes comprehensive error handling with detailed error messages
- Uses a longer timeout to ensure download completes successfully
- Returns the audio blob for further processing

```typescript
// Record video+audio but save just the audio
const audioBlob = recorder.saveAsAudio('audio-only.mp3'); // Will use mp3 extension if supported
```

### `replay(container?: HTMLElement, options?: ReplayOptions): HTMLVideoElement`
Creates a video element to replay the recording and returns the created video element.

Parameters:
- `container` (optional): HTML element to append the video to
- `options` (optional): Configuration options for the video element
  - `width`: Width of the video element (string or number)
  - `height`: Height of the video element (string or number)
  - `controls`: Whether to show video controls (default: true)
  - `autoplay`: Whether to autoplay the video (default: false)
  - `muted`: Whether to mute the video (default: false)
  - `loop`: Whether to loop the video (default: false)

```typescript
// Create a video element with custom options
const videoElement = recorder.replay(document.getElementById('video-container'), {
  width: 640,
  height: 480,
  controls: true,
  autoplay: false
});

// Add custom styling or event listeners
videoElement.style.border = '1px solid #ccc';
videoElement.addEventListener('ended', () => console.log('Video playback ended'));
```

### `replayAudio(container?: HTMLElement, options?: AudioReplayOptions): HTMLAudioElement`
Creates an audio element to replay the audio recording and returns the created audio element.

Parameters:
- `container` (optional): HTML element to append the audio to
- `options` (optional): Configuration options for the audio element
  - `controls`: Whether to show audio controls (default: true)
  - `autoplay`: Whether to autoplay the audio (default: false)
  - `loop`: Whether to loop the audio (default: false)

```typescript
// Create an audio element with custom options
const audioElement = recorder.replayAudio(document.getElementById('audio-container'), {
  controls: true,
  autoplay: false,
  loop: false
});

// Add custom styling or event listeners
audioElement.style.width = '100%';
audioElement.addEventListener('ended', () => console.log('Audio playback ended'));
```

### `upload(url: string, formFieldName?: string): Promise<Response>`
Uploads the recording to a server via HTTP POST. You can specify the form field name (defaults to "file").

---

## 🧪 Development

```bash
git clone https://github.com/srshkmr/recastra.git
cd recastra
npm install
npm run dev  # Uses Rollup in watch mode for development
```

### Package Size Optimization

Recastra is designed to be lightweight while providing powerful recording capabilities. The package size has been optimized by:

1. **Rollup Bundling & Minification**: JavaScript files are bundled and minified during the build process using Rollup with the Terser plugin, reducing the package size significantly. The build process includes:
   - Module bundling with code splitting for better organization
   - Advanced code compression techniques
   - Property mangling for private properties
   - Dead code elimination
   - Removal of comments and whitespace
   - Preservation of module structure for better imports

2. **Excluding source maps from the published package**: Source maps are useful for debugging but add approximately 25% to the package size. They are excluded from the published package using the "files" field in package.json.

3. **Minimal runtime dependencies**: Recastra has zero runtime dependencies, relying only on native browser APIs.

4. **ES Modules**: Using ES modules allows for better tree-shaking and code optimization by modern bundlers.

If you want to further reduce the package size for your application, consider:

1. **Tree shaking**: Import only the specific components you need if your bundler supports tree shaking.

2. **Code splitting**: Load Recastra only when recording functionality is needed in your application.

3. **Custom builds**: If you only need specific features, you could create a custom build that excludes unused components.

Current package size:
- Main module (Recastra.js): 3.6 kB
- Total package size: ~15 kB

### Architecture

Recastra is built with a modular architecture that separates concerns into specialized components:

#### Core Components

1. **MediaStreamManager**: Handles media stream initialization and device enumeration
   - Manages access to camera and microphone
   - Provides methods to enumerate available devices
   - Handles stream updates and constraints

2. **AudioProcessor**: Handles audio processing and gain control
   - Processes audio streams to boost volume
   - Applies audio filters and compression
   - Manages Web Audio API integration

3. **RecordingManager**: Handles recording operations
   - Controls MediaRecorder lifecycle
   - Manages recording state and data collection
   - Implements error recovery mechanisms

4. **FileManager**: Handles saving and uploading recordings
   - Provides methods to save recordings to disk
   - Extracts audio from video recordings
   - Handles uploading to servers

The main `Recastra` class acts as a facade that coordinates these components, providing a simple and consistent API while delegating the implementation details to the specialized components.

This architecture provides several benefits:
- **Separation of concerns**: Each component has a single responsibility
- **Improved maintainability**: Changes to one component don't affect others
- **Better testability**: Components can be tested in isolation
- **Enhanced extensibility**: New features can be added by extending specific components

### Recent Improvements

Recastra has undergone significant improvements to enhance maintainability, extensibility, and type safety:

1. **Code Refactoring**:
   - Applied DRY (Don't Repeat Yourself) principles by extracting repeated logic into reusable functions
   - Implemented a helper method `handleStreamUpdate` to centralize stream update logic
   - Created a generic `getRecordingBlobAndPerform` method to reduce code duplication in blob operations
   - Improved error handling with more specific type assertions

2. **Type Safety Enhancements**:
   - Added explicit `RecordingState` type for better state management
   - Created an interface for recording blob operations with generic return types
   - Replaced non-null assertions (`!`) with proper type assertions (`as`) after validation
   - Enhanced TypeScript interfaces for better IDE support and documentation

3. **Build System Upgrade**:
   - Migrated from a custom build process to Rollup for modern module bundling
   - Implemented code splitting to preserve module structure
   - Configured Terser plugin for optimal minification
   - Improved development workflow with watch mode

### Building

To build the package for production:

```bash
npm run build
```

This will compile the TypeScript code using Rollup, which bundles and minifies the code while preserving the module structure. The distribution files will be generated in the `dist` directory.

If you need to use the legacy build process:

```bash
npm run build:legacy
```

### Testing

Recastra uses Jest for testing. To run the tests:

```bash
npm test
```

To run tests in watch mode during development:

```bash
npm run test:watch
```

### Linting and Formatting

Recastra uses ESLint and Prettier for code quality and formatting:

```bash
# Run linting
npm run lint

# Format code
npm run format
```

### Local Development Server

When testing ES modules locally, browsers enforce CORS policies that prevent loading modules from `file://` URLs. To avoid this issue, use the included development server:

```bash
# Start a local development server
npm run serve
```

This will start an HTTP server and automatically open your browser. You can then access the example HTML files without CORS errors.

## 🔌 Framework Integration

Recastra is framework-agnostic and can be used with any JavaScript framework:

### Plain HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recastra HTML Example</title>
  <script src="https://unpkg.com/recastra/dist/index.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    button {
      padding: 10px 15px;
      margin: 5px;
      cursor: pointer;
    }
    #status {
      margin-top: 20px;
      font-style: italic;
    }
    #preview {
      width: 100%;
      height: 300px;
      background: #f0f0f0;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <h1>Recastra Recording Demo</h1>

  <div>
    <button id="startBtn">Start Recording</button>
    <button id="stopBtn" disabled>Stop Recording</button>
  </div>

  <div id="status">Ready to record</div>

  <!-- Camera preview -->
  <h3>Camera Preview</h3>
  <video id="preview" autoplay muted playsinline style="width: 100%; max-height: 300px; background: #f0f0f0;"></video>

  <!-- Recording playback container -->
  <div id="playbackContainer" style="margin-top: 20px;"></div>

  <script>
    // Access the Recastra constructor from the global scope
    const { Recastra } = window.Recastra;

    // DOM elements
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const status = document.getElementById('status');
    const preview = document.getElementById('preview');
    const playbackContainer = document.getElementById('playbackContainer');

    // Initialize recorder
    let recorder = null;
    let isRecording = false;
    let videoElement = null;

    async function initRecorder() {
      try {
        recorder = new Recastra();
        await recorder.init({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }, 
          video: { 
            width: 1280, 
            height: 720 
          } 
        });

        // Display the camera preview
        preview.srcObject = recorder.getStream();

        status.textContent = 'Recorder initialized. Ready to start.';
        startBtn.disabled = false;
      } catch (error) {
        status.textContent = `Error: ${error.message}`;
        console.error('Initialization error:', error);
      }
    }

    // Start recording
    startBtn.addEventListener('click', () => {
      if (recorder && !isRecording) {
        recorder.start();
        isRecording = true;
        status.textContent = 'Recording...';
        startBtn.disabled = true;
        stopBtn.disabled = false;

        // Remove previous playback if exists
        if (videoElement) {
          playbackContainer.innerHTML = '';
          videoElement = null;
        }
      }
    });

    // Stop recording
    stopBtn.addEventListener('click', async () => {
      if (recorder && isRecording) {
        const blob = await recorder.stop();
        isRecording = false;
        status.textContent = `Recording stopped. Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`;

        // Create a heading for the playback
        const playbackHeading = document.createElement('h3');
        playbackHeading.textContent = 'Recording Playback';
        playbackContainer.appendChild(playbackHeading);

        // Use the replay method to create a video element for playback
        videoElement = recorder.replay(playbackContainer, {
          width: '100%',
          height: 'auto',
          controls: true,
          autoplay: false
        });

        // Create download buttons
        const downloadDiv = document.createElement('div');
        downloadDiv.style.marginTop = '10px';

        // Video download button
        const videoBtn = document.createElement('button');
        videoBtn.textContent = 'Download Video';
        videoBtn.onclick = () => recorder.save('html-recording.mp4');
        downloadDiv.appendChild(videoBtn);

        // Audio download button
        const audioBtn = document.createElement('button');
        audioBtn.textContent = 'Download Audio Only';
        audioBtn.onclick = () => recorder.saveAsAudio('html-recording-audio.mp3');
        audioBtn.style.marginLeft = '10px';
        downloadDiv.appendChild(audioBtn);

        // Add buttons to the page
        playbackContainer.appendChild(downloadDiv);

        startBtn.disabled = false;
        stopBtn.disabled = true;
      }
    });

    // Initialize on page load
    window.addEventListener('DOMContentLoaded', initRecorder);

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      if (recorder) {
        recorder.dispose();
      }
    });
  </script>
</body>
</html>
```

### React

```tsx
import { useState, useEffect, useRef } from 'react';
import { Recastra } from '@srshkmr02/recastra';

function RecordingComponent() {
  const [recorder, setRecorder] = useState<Recastra | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize recorder
    const initRecorder = async () => {
      try {
        const newRecorder = new Recastra();
        await newRecorder.init({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }, 
          video: { 
            width: 1280, 
            height: 720 
          } 
        });

        setRecorder(newRecorder);

        // Display the camera preview
        if (videoRef.current && newRecorder.getStream()) {
          videoRef.current.srcObject = newRecorder.getStream();
        }
      } catch (error) {
        console.error('Error initializing recorder:', error);
      }
    };

    initRecorder();

    // Clean up on unmount
    return () => {
      if (recorder) {
        recorder.dispose();
      }
      if (videoElement) {
        setVideoElement(null);
      }
    };
  }, []);

  const startRecording = () => {
    if (recorder) {
      recorder.start();
      setIsRecording(true);
    }
  };

  const stopRecording = async () => {
    if (recorder && isRecording) {
      const blob = await recorder.stop();
      setRecordingBlob(blob);
      setIsRecording(false);

      // Create a video element to replay the recording
      if (previewContainerRef.current) {
        const video = recorder.replay(previewContainerRef.current, {
          width: '100%',
          height: 'auto',
          controls: true,
          autoplay: false
        });
        setVideoElement(video);
      }
    }
  };

  const downloadVideo = () => {
    if (recorder && recordingBlob) {
      recorder.save('react-recording.mp4');
    }
  };

  const downloadAudio = () => {
    if (recorder && recordingBlob) {
      recorder.saveAsAudio('react-recording-audio.mp3');
    }
  };

  return (
    <div>
      <div>
        <button onClick={startRecording} disabled={isRecording || !recorder}>
          Start Recording
        </button>
        <button onClick={stopRecording} disabled={!isRecording}>
          Stop Recording
        </button>
      </div>

      {/* Live preview */}
      <div style={{ marginTop: '20px' }}>
        <h3>Camera Preview</h3>
        <video 
          ref={videoRef}
          style={{ width: '100%', maxHeight: '300px', backgroundColor: '#f0f0f0' }}
          autoPlay 
          muted 
          playsInline
        />
      </div>

      {/* Recording playback */}
      <div ref={previewContainerRef} style={{ marginTop: '20px' }}>
        {recordingBlob && !videoElement && <h3>Recording Playback</h3>}
      </div>

      {recordingBlob && (
        <div style={{ marginTop: '10px' }}>
          <button onClick={downloadVideo}>Download Video</button>
          <button onClick={downloadAudio} style={{ marginLeft: '10px' }}>
            Download Audio Only
          </button>
        </div>
      )}
    </div>
  );
}
```

### Vue.js

```vue
<template>
  <div>
    <div>
      <button @click="startRecording" :disabled="isRecording || !recorder">
        Start Recording
      </button>
      <button @click="stopRecording" :disabled="!isRecording">
        Stop Recording
      </button>
    </div>

    <!-- Live preview -->
    <div style="margin-top: 20px;">
      <h3>Camera Preview</h3>
      <video 
        ref="videoPreview"
        style="width: 100%; max-height: 300px; background-color: #f0f0f0;"
        autoplay 
        muted 
        playsinline
      ></video>
    </div>

    <!-- Recording playback -->
    <div ref="previewContainer" style="margin-top: 20px;">
      <h3 v-if="recordingBlob && !videoElement">Recording Playback</h3>
    </div>

    <div v-if="recordingBlob" style="margin-top: 10px;">
      <button @click="downloadVideo">Download Video</button>
      <button @click="downloadAudio" style="margin-left: 10px;">
        Download Audio Only
      </button>
    </div>
  </div>
</template>

<script>
import { Recastra } from '@srshkmr02/recastra';

export default {
  data() {
    return {
      recorder: null,
      isRecording: false,
      recordingBlob: null,
      videoElement: null
    };
  },
  async mounted() {
    try {
      // Initialize recorder
      this.recorder = new Recastra();
      await this.recorder.init({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: { 
          width: 1280, 
          height: 720 
        } 
      });

      // Display the camera preview
      if (this.$refs.videoPreview && this.recorder.getStream()) {
        this.$refs.videoPreview.srcObject = this.recorder.getStream();
      }
    } catch (error) {
      console.error('Error initializing recorder:', error);
    }
  },
  beforeUnmount() {
    // Clean up
    if (this.recorder) {
      this.recorder.dispose();
    }
    this.videoElement = null;
  },
  methods: {
    startRecording() {
      if (this.recorder) {
        this.recorder.start();
        this.isRecording = true;
      }
    },
    async stopRecording() {
      if (this.recorder && this.isRecording) {
        const blob = await this.recorder.stop();
        this.recordingBlob = blob;
        this.isRecording = false;

        // Create a video element to replay the recording
        if (this.$refs.previewContainer) {
          const video = this.recorder.replay(this.$refs.previewContainer, {
            width: '100%',
            height: 'auto',
            controls: true,
            autoplay: false
          });
          this.videoElement = video;
        }
      }
    },
    downloadVideo() {
      if (this.recorder && this.recordingBlob) {
        this.recorder.save('vue-recording.mp4');
      }
    },
    downloadAudio() {
      if (this.recorder && this.recordingBlob) {
        this.recorder.saveAsAudio('vue-recording-audio.mp3');
      }
    }
  }
};
</script>
```

## 🌐 Browser Compatibility

Recastra is compatible with all modern browsers that support the MediaRecorder API:

- Chrome 49+
- Firefox 29+
- Edge 79+
- Safari 14.1+ (partial support)

For older browsers, consider using a polyfill or fallback mechanism.

## 📄 License

MIT License—see the [LICENSE](LICENSE) file for details.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=srshkmr/recastra&type=Date)](https://star-history.com/#srshkmr/recastra&Date)
