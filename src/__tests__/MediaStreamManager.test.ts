import { MediaStreamManager } from '../core/MediaStreamManager';

describe('MediaStreamManager', () => {
  let mediaStreamManager: MediaStreamManager;

  beforeEach(() => {
    mediaStreamManager = new MediaStreamManager();
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    mediaStreamManager.dispose();
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      expect(mediaStreamManager).toBeInstanceOf(MediaStreamManager);
    });

    it('should set audioOnly from options', () => {
      const customManager = new MediaStreamManager({ audioOnly: true });
      expect(customManager['audioOnly']).toBe(true);
    });
  });

  describe('initStream', () => {
    it('should initialize with default constraints', async () => {
      await mediaStreamManager.initStream();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: true
      });
      expect(mediaStreamManager['stream']).not.toBeNull();
    });

    it('should initialize with custom constraints', async () => {
      const constraints = {
        audio: { deviceId: 'test-audio' },
        video: { width: 1280, height: 720 }
      };
      await mediaStreamManager.initStream(constraints);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(constraints);
      expect(mediaStreamManager['stream']).not.toBeNull();
    });

    it('should throw error if getUserMedia fails', async () => {
      // Mock getUserMedia to reject
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
        new Error('Permission denied')
      );

      await expect(mediaStreamManager.initStream()).rejects.toThrow(
        'Failed to initialize media stream'
      );
    });
  });

  describe('updateStream', () => {
    beforeEach(async () => {
      await mediaStreamManager.initStream();
    });

    it('should update stream with new constraints', async () => {
      const newConstraints = { audio: true, video: false };
      await mediaStreamManager.updateStream(newConstraints);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(newConstraints);
    });

    it('should maintain video tracks when maintainVideo is true', async () => {
      const initialStream = mediaStreamManager.getStream();
      const initialVideoTracks = initialStream!.getVideoTracks();

      // Mock a video track
      const mockVideoTrack = { kind: 'video' };
      initialVideoTracks.push(mockVideoTrack as unknown as MediaStreamTrack);

      const newConstraints = { audio: { deviceId: 'new-audio' }, video: true };
      await mediaStreamManager.updateStream(newConstraints, true);

      // Verify that getUserMedia was called with audio-only constraints
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.anything(),
          video: false
        })
      );
    });
  });

  describe('getAudioDevices', () => {
    it('should return audio input devices', async () => {
      // Mock enumerateDevices to return some devices
      const mockDevices = [
        { kind: 'audioinput', deviceId: 'audio1' },
        { kind: 'videoinput', deviceId: 'video1' },
        { kind: 'audioinput', deviceId: 'audio2' }
      ];

      navigator.mediaDevices.enumerateDevices = jest.fn().mockResolvedValue(mockDevices);

      const audioDevices = await mediaStreamManager.getAudioDevices();
      expect(audioDevices.length).toBe(2);
      expect(audioDevices[0].kind).toBe('audioinput');
      expect(audioDevices[1].kind).toBe('audioinput');
    });
  });

  describe('getVideoDevices', () => {
    it('should return video input devices', async () => {
      // Mock enumerateDevices to return some devices
      const mockDevices = [
        { kind: 'audioinput', deviceId: 'audio1' },
        { kind: 'videoinput', deviceId: 'video1' },
        { kind: 'videoinput', deviceId: 'video2' }
      ];

      navigator.mediaDevices.enumerateDevices = jest.fn().mockResolvedValue(mockDevices);

      const videoDevices = await mediaStreamManager.getVideoDevices();
      expect(videoDevices.length).toBe(2);
      expect(videoDevices[0].kind).toBe('videoinput');
      expect(videoDevices[1].kind).toBe('videoinput');
    });
  });

  describe('getStream', () => {
    it('should return the current stream', async () => {
      await mediaStreamManager.initStream();
      const stream = mediaStreamManager.getStream();
      expect(stream).toBe(mediaStreamManager['stream']);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      await mediaStreamManager.initStream();
      const mockTrack = mediaStreamManager['stream']!.getTracks()[0];
      const stopSpy = jest.spyOn(mockTrack, 'stop');

      mediaStreamManager.dispose();

      expect(stopSpy).toHaveBeenCalled();
      expect(mediaStreamManager['stream']).toBeNull();
    });
  });
});
