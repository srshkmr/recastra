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
- 🎥 Supports camera and microphone access
- 📐 Choose video resolution (e.g., 720p, 1080p)
- 🔄 Seamless recording continuity when input source changes
- 🧭 Adjustable recording duration and intervals
- 🧬 Multi-stream (record multiple tracks simultaneously)
- 🔧 Configurable recorder options (bitrate, codecs, etc.)

### Device Support
- 🎚️ Select input devices: microphone and camera
- 🌐 Cross-browser support (Chrome, Firefox, Edge)
- 🍏 Safari compatibility (with WebKit-specific constraints)
- 🧩 Works with canvas and screen streams (e.g., screen sharing, canvas recording)

### Export Options
- 💾 Export video recordings as `webm` or `mp4`
- 💾 Export audio recordings as `wav` or `mp3`
- 🧾 Set MIME type for recording (e.g., `video/webm`, `audio/wav`)
- 📁 Save to disk or upload to server

### Advanced Features
- ⚡ Easily embeddable into any web project
- 🔄 Dynamic stream updates without stopping recording
- 🧱 Written in TypeScript for type safety

---

## 🛠 API

### `init(): Promise<void>`
Requests camera and microphone access from the user.

### `init(constraints?: MediaStreamConstraints): Promise<void>`
Initializes the stream with custom audio/video constraints (e.g., resolution, device selection).

### `setMimeType(type: string): void`
Sets the MIME type to be used for recording (e.g., `video/webm`, `audio/webm`, `audio/wav`).

### `start(): void`
Begins recording the available streams.

### `stop(): Promise<Blob>`
Stops the recording and returns a `Blob` of the media.

### `updateStream(constraints: MediaStreamConstraints): Promise<void>`
Dynamically updates the recording stream with new audio/video constraints without stopping the current recording session. Useful for switching cameras or microphones during recording.

### `getStream(): MediaStream`
Returns the current active MediaStream being used for recording.

### `pause(): void`
Pauses the recording session.

### `resume(): void`
Resumes a paused recording session.

### `save(fileName?: string): void`
Downloads the recording using a generated blob URL. Optionally specify a file name.

### `upload(url: string, formFieldName?: string): Promise<Response>`
Uploads the recording to a server via HTTP POST. You can specify the form field name (defaults to "file").

---

## 🧪 Development

```bash
git clone https://github.com/srshkmr/recastra.git
cd recastra
npm install
npm run dev
```

### Building

To build the package for production:

```bash
npm run build
```

This will compile the TypeScript code and generate the distribution files in the `dist` directory.

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

## 🔌 Framework Integration

Recastra is framework-agnostic and can be used with any JavaScript framework:

### React

```tsx
import { useState, useEffect } from 'react';
import { Recastra } from 'recastra';

function RecordingComponent() {
  const [recorder, setRecorder] = useState<Recastra | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // Initialize recorder
    const initRecorder = async () => {
      const newRecorder = new Recastra();
      await newRecorder.init({ audio: true, video: true });
      setRecorder(newRecorder);
    };

    initRecorder();

    // Clean up on unmount
    return () => {
      if (recorder) {
        recorder.dispose();
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
      setIsRecording(false);
      recorder.save('react-recording.webm');
    }
  };

  return (
    <div>
      <button onClick={startRecording} disabled={isRecording || !recorder}>
        Start Recording
      </button>
      <button onClick={stopRecording} disabled={!isRecording}>
        Stop Recording
      </button>
    </div>
  );
}
```

### Vue.js

```vue
<template>
  <div>
    <button @click="startRecording" :disabled="isRecording || !recorder">
      Start Recording
    </button>
    <button @click="stopRecording" :disabled="!isRecording">
      Stop Recording
    </button>
  </div>
</template>

<script>
import { Recastra } from 'recastra';

export default {
  data() {
    return {
      recorder: null,
      isRecording: false
    };
  },
  async mounted() {
    // Initialize recorder
    this.recorder = new Recastra();
    await this.recorder.init({ audio: true, video: true });
  },
  beforeUnmount() {
    // Clean up
    if (this.recorder) {
      this.recorder.dispose();
    }
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
        this.isRecording = false;
        this.recorder.save('vue-recording.webm');
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

MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=srshkmr/recastra&type=Date)](https://star-history.com/#srshkmr/recastra&Date)
