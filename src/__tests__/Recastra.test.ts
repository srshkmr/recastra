import { Recastra } from '../Recastra';

describe('Recastra', () => {
  let recastra: Recastra;

  beforeEach(() => {
    recastra = new Recastra();
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    recastra.dispose();
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      expect(recastra).toBeInstanceOf(Recastra);
    });

    it('should set mimeType from options', () => {
      const customRecastra = new Recastra({ mimeType: 'audio/webm' });
      expect(customRecastra['mimeType']).toBe('audio/webm');
    });

    it('should set recordingOptions from options', () => {
      const options = { audioBitsPerSecond: 128000 };
      const customRecastra = new Recastra({ recordingOptions: options });
      expect(customRecastra['recordingOptions']).toEqual(options);
    });
  });

  describe('init', () => {
    it('should initialize with default constraints', async () => {
      await recastra.init();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true, video: true });
      expect(recastra['stream']).not.toBeNull();
    });

    it('should initialize with custom constraints', async () => {
      const constraints = { 
        audio: { deviceId: 'test-audio' }, 
        video: { width: 1280, height: 720 } 
      };
      await recastra.init(constraints);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(constraints);
      expect(recastra['stream']).not.toBeNull();
    });

    it('should throw error if getUserMedia fails', async () => {
      // Mock getUserMedia to reject
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));
      
      await expect(recastra.init()).rejects.toThrow('Failed to initialize media stream');
    });
  });

  describe('setMimeType', () => {
    it('should set mimeType if supported', () => {
      recastra.setMimeType('audio/webm');
      expect(recastra['mimeType']).toBe('audio/webm');
    });

    it('should not change mimeType if not supported', () => {
      const originalMimeType = recastra['mimeType'];
      recastra.setMimeType('unsupported/type');
      expect(recastra['mimeType']).toBe(originalMimeType);
    });
  });

  describe('recording functions', () => {
    beforeEach(async () => {
      await recastra.init();
    });

    it('should start recording', () => {
      recastra.start();
      expect(recastra['mediaRecorder']).not.toBeNull();
      expect(recastra['mediaRecorder']!.state).toBe('recording');
    });

    it('should throw error if start is called without init', () => {
      const uninitializedRecastra = new Recastra();
      expect(() => uninitializedRecastra.start()).toThrow('Stream not initialized');
    });

    it('should stop recording and return blob', async () => {
      recastra.start();
      const blob = await recastra.stop();
      expect(blob).toBeInstanceOf(Blob);
      expect(recastra['mediaRecorder']!.state).toBe('inactive');
    });

    it('should reject if stop is called without recording', async () => {
      await expect(recastra.stop()).rejects.toThrow('Recording not in progress');
    });

    it('should pause recording', () => {
      recastra.start();
      recastra.pause();
      expect(recastra['mediaRecorder']!.state).toBe('paused');
    });

    it('should resume recording', () => {
      recastra.start();
      recastra.pause();
      recastra.resume();
      expect(recastra['mediaRecorder']!.state).toBe('recording');
    });
  });

  describe('updateStream', () => {
    beforeEach(async () => {
      await recastra.init();
    });

    it('should update stream with new constraints', async () => {
      const newConstraints = { audio: true, video: false };
      await recastra.updateStream(newConstraints);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(newConstraints);
    });

    it('should restart recording if it was recording', async () => {
      recastra.start();
      const newConstraints = { audio: true, video: false };
      await recastra.updateStream(newConstraints);
      expect(recastra['mediaRecorder']!.state).toBe('recording');
    });
  });

  describe('getStream', () => {
    it('should return the current stream', async () => {
      await recastra.init();
      const stream = recastra.getStream();
      expect(stream).toBe(recastra['stream']);
    });

    it('should throw error if getStream is called without init', () => {
      const uninitializedRecastra = new Recastra();
      expect(() => uninitializedRecastra.getStream()).toThrow('Stream not initialized');
    });
  });

  describe('save', () => {
    beforeEach(async () => {
      await recastra.init();
      recastra.start();
      await recastra.stop();
    });

    it('should create and click a download link', () => {
      // Mock document.createElement and appendChild
      const mockAnchor = {
        style: { display: 'none' },
        href: '',
        download: '',
        click: jest.fn()
      };
      
      document.createElement = jest.fn().mockReturnValue(mockAnchor);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();
      
      recastra.save('test.webm');
      
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.download).toBe('test.webm');
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('should throw error if save is called without recording', () => {
      const uninitializedRecastra = new Recastra();
      expect(() => uninitializedRecastra.save()).toThrow('No recording available');
    });
  });

  describe('upload', () => {
    beforeEach(async () => {
      await recastra.init();
      recastra.start();
      await recastra.stop();
    });

    it('should upload the recording to a server', async () => {
      const response = await recastra.upload('https://example.com/upload');
      expect(fetch).toHaveBeenCalled();
      expect(response).toBeDefined();
    });

    it('should throw error if upload is called without recording', async () => {
      const uninitializedRecastra = new Recastra();
      await expect(uninitializedRecastra.upload('https://example.com/upload')).rejects.toThrow('No recording available');
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      await recastra.init();
      const mockTrack = recastra['stream']!.getTracks()[0];
      const stopSpy = jest.spyOn(mockTrack, 'stop');
      
      recastra.dispose();
      
      expect(stopSpy).toHaveBeenCalled();
      expect(recastra['stream']).toBeNull();
      expect(recastra['mediaRecorder']).toBeNull();
      expect(recastra['chunks']).toEqual([]);
      expect(recastra['recordingBlob']).toBeNull();
    });
  });
});