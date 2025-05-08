import { MediaStreamManager } from '../core/MediaStreamManager';
import * as mediaUtils from '../utils/media';
import * as errorUtils from '../utils/error';

describe('MediaStreamManager', () => {
  let mediaStreamManager: MediaStreamManager;

  beforeEach(() => {
    mediaStreamManager = new MediaStreamManager();
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock utility functions
    jest.spyOn(mediaUtils, 'createAudioConstraints').mockImplementation(constraints => {
      if (typeof constraints === 'boolean' || constraints === undefined) {
        return {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        };
      }
      return {
        ...constraints,
        echoCancellation: constraints.echoCancellation ?? true,
        noiseSuppression: constraints.noiseSuppression ?? true,
        autoGainControl: constraints.autoGainControl ?? true
      };
    });

    jest.spyOn(errorUtils, 'executeWithTimeout').mockImplementation(fn => fn());
    jest.spyOn(errorUtils, 'safeExecuteAsync').mockImplementation(fn => fn());
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

      // Create a deep copy of constraints to avoid modification by reference
      const expectedConstraints = JSON.parse(JSON.stringify(constraints)) as typeof constraints;

      await mediaStreamManager.initStream(constraints);

      // Use objectContaining to allow for additional properties in the audio constraints
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            deviceId: 'test-audio'
          }),
          video: expectedConstraints.video
        })
      );
      expect(mediaStreamManager['stream']).not.toBeNull();
    });

    it('should throw error if getUserMedia fails', async () => {
      // Mock getUserMedia to reject
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
        new Error('Permission denied')
      );

      // Mock safeExecuteAsync to rethrow the error
      jest.spyOn(errorUtils, 'safeExecuteAsync').mockImplementation((fn, errorMessage) => {
        try {
          return fn();
        } catch (error) {
          throw new Error(
            `${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      });

      // Use a partial string match instead of an exact match
      await expect(mediaStreamManager.initStream()).rejects.toThrow(/Permission denied/);
    });
  });

  describe('updateStream', () => {
    beforeEach(() => {
      // Mock removeAudioTracks to avoid the removeTrack error
      jest.spyOn(mediaUtils, 'removeAudioTracks').mockImplementation(() => {});

      // Mock the stream with proper methods
      const mockStream = {
        getAudioTracks: jest.fn().mockReturnValue([]),
        getVideoTracks: jest.fn().mockReturnValue([]),
        getTracks: jest.fn().mockReturnValue([]),
        removeTrack: jest.fn(),
        addTrack: jest.fn()
      } as unknown as MediaStream;

      // Set the mock stream directly
      mediaStreamManager['stream'] = mockStream;
    });

    it('should update stream with new constraints', async () => {
      const newConstraints = { audio: true, video: false };
      await mediaStreamManager.updateStream(newConstraints);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: false
        })
      );
    });

    it('should maintain video tracks when maintainVideo is true', async () => {
      // Create a mock stream with video tracks
      const mockVideoTrack = {
        kind: 'video',
        stop: jest.fn()
      } as unknown as MediaStreamTrack;

      const mockStream = {
        getAudioTracks: jest.fn().mockReturnValue([]),
        getVideoTracks: jest.fn().mockReturnValue([mockVideoTrack]),
        getTracks: jest.fn().mockReturnValue([mockVideoTrack]),
        removeTrack: jest.fn(),
        addTrack: jest.fn()
      } as unknown as MediaStream;

      // Set the mock stream directly
      mediaStreamManager['stream'] = mockStream;

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
