import { AudioProcessor } from '../core/AudioProcessor';

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
      };

      // Mock AudioContext and its methods
      const mockGainNode = {
        gain: {
          setValueAtTime: jest.fn(),
          linearRampToValueAtTime: jest.fn()
        },
        connect: jest.fn()
      };

      const mockFilterNode = {
        connect: jest.fn()
      };

      const mockCompressorNode = {
        connect: jest.fn()
      };

      const mockSourceNode = {
        connect: jest.fn()
      };

      const mockDestinationNode = {
        stream: {
          getAudioTracks: jest.fn().mockReturnValue([mockAudioTrack])
        }
      };

      const mockAudioContext = {
        createGain: jest.fn().mockReturnValue(mockGainNode),
        createBiquadFilter: jest.fn().mockReturnValue(mockFilterNode),
        createDynamicsCompressor: jest.fn().mockReturnValue(mockCompressorNode),
        createMediaStreamSource: jest.fn().mockReturnValue(mockSourceNode),
        createMediaStreamDestination: jest.fn().mockReturnValue(mockDestinationNode),
        currentTime: 0,
        sampleRate: 48000
      };

      // Mock global AudioContext constructor
      global.AudioContext = jest
        .fn()
        .mockImplementation(() => mockAudioContext) as unknown as typeof AudioContext;

      // Mock MediaStream constructor
      const mockProcessedStream = {
        addTrack: jest.fn()
      };
      global.MediaStream = jest
        .fn()
        .mockImplementation(() => mockProcessedStream) as unknown as typeof MediaStream;

      // Process the stream
      const result = audioProcessor.processAudioStream(mockStream as unknown as MediaStream);

      // Verify that the audio context was created
      expect(global.AudioContext).toHaveBeenCalled();

      // Verify that the gain node was created and configured
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
      expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(2.0, 0.05);

      // Verify that the nodes were connected
      expect(mockSourceNode.connect).toHaveBeenCalledWith(mockFilterNode);
      expect(mockFilterNode.connect).toHaveBeenCalledWith(mockCompressorNode);
      expect(mockCompressorNode.connect).toHaveBeenCalledWith(mockGainNode);
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockDestinationNode);

      // Verify that the audio track was added to the processed stream
      expect(mockProcessedStream.addTrack).toHaveBeenCalledWith(mockAudioTrack);

      // Verify that the processed stream was returned
      expect(result).toBe(mockProcessedStream);
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
