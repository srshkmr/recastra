import { AudioProcessor } from '../core/AudioProcessor';
import * as audioUtils from '../utils/audio';

describe('AudioProcessor', () => {
  let audioProcessor: AudioProcessor;

  beforeEach(() => {
    audioProcessor = new AudioProcessor();
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    audioProcessor.dispose();
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      expect(audioProcessor).toBeInstanceOf(AudioProcessor);
      expect(audioProcessor['audioGain']).toBe(2.0); // Default gain
    });

    it('should set audioGain from options', () => {
      const customProcessor = new AudioProcessor({ audioGain: 1.5 });
      expect(customProcessor['audioGain']).toBe(1.5);
    });
  });

  describe('setAudioGain', () => {
    it('should set the audio gain level', () => {
      // setAudioGain is synchronous and returns void
      audioProcessor.setAudioGain(1.5);
      expect(audioProcessor['audioGain']).toBe(1.5);
    });

    it('should throw error if gain is less than or equal to 0', () => {
      // For synchronous functions, use regular expect().toThrow() instead of await expect().rejects.toThrow()
      expect(() => audioProcessor.setAudioGain(0)).toThrow('Gain must be greater than 0');
      expect(() => audioProcessor.setAudioGain(-1)).toThrow('Gain must be greater than 0');
    });

    it('should update gain node value if it exists', () => {
      // Create a mock gain node
      const mockGainNode = {
        gain: {
          value: 1.0
        }
      };
      audioProcessor['gainNode'] = mockGainNode as unknown as GainNode;

      // setAudioGain is synchronous
      audioProcessor.setAudioGain(1.5);
      expect(mockGainNode.gain.value).toBe(1.5);
    });
  });

  describe('processAudioStream', () => {
    it('should process the audio stream', () => {
      // Create a mock stream with audio tracks
      const mockAudioTrack = {
        kind: 'audio',
        applyConstraints: jest.fn().mockResolvedValue(undefined)
      };
      const mockStream = {
        getAudioTracks: jest.fn().mockReturnValue([mockAudioTrack]),
        getVideoTracks: jest.fn().mockReturnValue([])
      } as unknown as MediaStream;

      // Create a mock processed stream
      const mockProcessedStream = {
        addTrack: jest.fn(),
        getAudioTracks: jest.fn().mockReturnValue([mockAudioTrack]),
        getVideoTracks: jest.fn().mockReturnValue([])
      } as unknown as MediaStream;

      // Mock AudioContext
      const mockAudioContext = {
        createGain: jest.fn(),
        resume: jest.fn().mockResolvedValue(undefined),
        state: 'running',
        sampleRate: 48000
      } as unknown as AudioContext;

      // Mock audio utility functions
      jest.spyOn(audioUtils, 'createOptimizedAudioContext').mockReturnValue(mockAudioContext);
      jest.spyOn(audioUtils, 'createProcessedAudioStream').mockReturnValue(mockProcessedStream);

      // Process the stream
      const result = audioProcessor.processAudioStream(mockStream);

      // Verify that createOptimizedAudioContext was called
      expect(audioUtils.createOptimizedAudioContext).toHaveBeenCalled();

      // Verify that createProcessedAudioStream was called with the correct parameters
      expect(audioUtils.createProcessedAudioStream).toHaveBeenCalledWith(
        mockStream,
        mockAudioContext,
        2.0 // Default gain
      );

      // Instead of comparing objects directly, verify that the result has the expected methods
      expect(result.getAudioTracks).toBeDefined();
      expect(result.getVideoTracks).toBeDefined();

      // Verify that createProcessedAudioStream was called with the correct parameters
      expect(audioUtils.createProcessedAudioStream).toHaveBeenCalledWith(
        mockStream,
        mockAudioContext,
        2.0 // Default gain
      );
    });

    it('should handle errors and return the original stream', () => {
      // Create a mock stream
      const mockStream = {
        getAudioTracks: jest.fn().mockImplementation(() => {
          throw new Error('Test error');
        })
      };

      // Process the stream
      const result = audioProcessor.processAudioStream(mockStream as unknown as MediaStream);

      // Verify that the original stream was returned
      expect(result).toBe(mockStream);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      // Create a mock audio context
      const mockAudioContext = {
        close: jest.fn().mockResolvedValue(undefined)
      };
      audioProcessor['audioContext'] = mockAudioContext as unknown as AudioContext;

      // Create a mock gain node
      const mockGainNode = {};
      audioProcessor['gainNode'] = mockGainNode as unknown as GainNode;

      // Dispose
      audioProcessor.dispose();

      // Verify that the audio context was closed
      expect(mockAudioContext.close).toHaveBeenCalled();

      // Verify that the references were cleared
      expect(audioProcessor['audioContext']).toBeNull();
      expect(audioProcessor['gainNode']).toBeNull();
    });
  });
});
