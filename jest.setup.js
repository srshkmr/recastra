// Mock the MediaRecorder API and other browser APIs for testing
if (typeof window !== 'undefined') {
  // Mock MediaRecorder
  class MockMediaRecorder {
    static isTypeSupported(type) {
      return ['video/webm', 'audio/webm', 'audio/wav'].includes(type);
    }

    constructor(stream, options = {}) {
      this.stream = stream;
      this.options = options;
      this.state = 'inactive';
      this.ondataavailable = null;
      this.onstop = null;
    }

    start() {
      this.state = 'recording';
      // Simulate data available event
      if (this.ondataavailable) {
        setTimeout(() => {
          const event = { data: new Blob(['test data'], { type: this.options.mimeType || 'video/webm' }) };
          this.ondataavailable(event);
        }, 100);
      }
    }

    stop() {
      this.state = 'inactive';
      if (this.onstop) {
        setTimeout(() => {
          this.onstop();
        }, 100);
      }
    }

    pause() {
      this.state = 'paused';
    }

    resume() {
      this.state = 'recording';
    }
  }

  // Mock MediaStream
  class MockMediaStream {
    constructor(tracks = []) {
      this.tracks = tracks;
    }

    getTracks() {
      return this.tracks;
    }

    getAudioTracks() {
      return this.tracks.filter(track => track.kind === 'audio');
    }

    getVideoTracks() {
      return this.tracks.filter(track => track.kind === 'video');
    }
  }

  // Mock MediaStreamTrack
  class MockMediaStreamTrack {
    constructor(kind = 'video') {
      this.kind = kind;
      this.enabled = true;
    }

    stop() {
      this.enabled = false;
    }
  }

  // Assign mocks to global object
  global.MediaRecorder = MockMediaRecorder;
  global.MediaStream = MockMediaStream;
  global.MediaStreamTrack = MockMediaStreamTrack;

  // Mock navigator.mediaDevices
  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {};
  }

  navigator.mediaDevices.getUserMedia = jest.fn().mockImplementation(constraints => {
    const tracks = [];
    if (constraints.audio) {
      tracks.push(new MockMediaStreamTrack('audio'));
    }
    if (constraints.video) {
      tracks.push(new MockMediaStreamTrack('video'));
    }
    return Promise.resolve(new MockMediaStream(tracks));
  });

  // Mock URL.createObjectURL and URL.revokeObjectURL
  if (!window.URL) {
    window.URL = {};
  }
  window.URL.createObjectURL = jest.fn().mockImplementation(blob => `mock-url-${Date.now()}`);
  window.URL.revokeObjectURL = jest.fn();

  // Mock fetch API
  global.fetch = jest.fn().mockImplementation(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob())
    })
  );
}