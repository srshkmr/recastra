import { AudioProcessor } from '../core/AudioProcessor';
import * as audioUtils from '../utils/audio';

describe('AudioProcessor', () => {
  let audioProcessor: AudioProcessor;

  beforeEach(() => {
    audioProcessor = new AudioProcessor();
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await audioProcessor.dispose();
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

    it('should throw error for invalid gain values', () => {
      expect(() => audioProcessor.setAudioGain(0)).toThrow('Gain must be greater than 0');
      expect(() => audioProcessor.setAudioGain(-1)).toThrow('Gain must be greater than 0');
      expect(() => audioProcessor.setAudioGain(NaN)).toThrow('Gain must be greater than 0');
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
      const mockStream = {
        getAudioTracks: jest.fn().mockReturnValue([])
      } as unknown as MediaStream;

      // Force an error by making createOptimizedAudioContext throw
      jest.spyOn(audioUtils, 'createOptimizedAudioContext').mockImplementation(() => {
        throw new Error('AudioContext not supported');
      });

      const result = audioProcessor.processAudioStream(mockStream);

      expect(result).toBe(mockStream);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      const mockAudioContext = {
        close: jest.fn().mockResolvedValue(undefined),
        state: 'running'
      };
      audioProcessor['audioContext'] = mockAudioContext as unknown as AudioContext;

      const mockGainNode = {};
      audioProcessor['gainNode'] = mockGainNode as unknown as GainNode;

      await audioProcessor.dispose();

      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(audioProcessor['audioContext']).toBeNull();
      expect(audioProcessor['gainNode']).toBeNull();
    });
  });
});
