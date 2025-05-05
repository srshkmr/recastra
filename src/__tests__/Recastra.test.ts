import { Recastra } from '../Recastra';
import { MediaStreamManager } from '../core/MediaStreamManager';
import { AudioProcessor } from '../core/AudioProcessor';
import { RecordingManager } from '../core/RecordingManager';
import { FileManager } from '../core/FileManager';

// Mock the component classes
jest.mock('../core/MediaStreamManager');
jest.mock('../core/AudioProcessor');
jest.mock('../core/RecordingManager');
jest.mock('../core/FileManager');

describe('Recastra', () => {
  let recastra: Recastra;
  let mockStreamManager: jest.Mocked<MediaStreamManager>;
  let mockAudioProcessor: jest.Mocked<AudioProcessor>;
  let mockRecordingManager: jest.Mocked<RecordingManager>;
  let mockFileManager: jest.Mocked<FileManager>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mock instances
    mockStreamManager = new MediaStreamManager() as jest.Mocked<MediaStreamManager>;
    mockAudioProcessor = new AudioProcessor() as jest.Mocked<AudioProcessor>;
    mockRecordingManager = new RecordingManager() as jest.Mocked<RecordingManager>;
    mockFileManager = new FileManager() as jest.Mocked<FileManager>;

    // Create a new Recastra instance
    recastra = new Recastra();

    // Set the mock instances
    recastra['streamManager'] = mockStreamManager;
    recastra['audioProcessor'] = mockAudioProcessor;
    recastra['recordingManager'] = mockRecordingManager;
    recastra['fileManager'] = mockFileManager;
  });

  afterEach(() => {
    // Clean up after each test
    recastra.dispose();
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      // Reset mocks to test constructor
      jest.clearAllMocks();

      // Create a new instance
      const newRecastra = new Recastra();

      // Verify that the component classes were instantiated with the correct options
      expect(MediaStreamManager).toHaveBeenCalledWith({ audioOnly: false });
      expect(AudioProcessor).toHaveBeenCalledWith({ audioGain: undefined });
      expect(RecordingManager).toHaveBeenCalledWith({
        mimeType: undefined,
        recordingOptions: undefined,
        audioOnly: false
      });
      expect(FileManager).toHaveBeenCalledWith({ audioOnly: false });

      expect(newRecastra).toBeInstanceOf(Recastra);
    });

    it('should pass options to component classes', () => {
      // Reset mocks to test constructor
      jest.clearAllMocks();

      // Create a new instance with options
      const options = {
        mimeType: 'audio/webm',
        recordingOptions: { audioBitsPerSecond: 128000 },
        audioOnly: true,
        audioGain: 1.5
      };
      // Create instance without assigning to unused variable
      new Recastra(options);

      // Verify that the component classes were instantiated with the correct options
      expect(MediaStreamManager).toHaveBeenCalledWith({ audioOnly: true });
      expect(AudioProcessor).toHaveBeenCalledWith({ audioGain: 1.5 });
      expect(RecordingManager).toHaveBeenCalledWith({
        mimeType: 'audio/webm',
        recordingOptions: { audioBitsPerSecond: 128000 },
        audioOnly: true
      });
      expect(FileManager).toHaveBeenCalledWith({ audioOnly: true });
    });
  });

  describe('init', () => {
    it('should initialize with default constraints', async () => {
      // Mock the initStream method
      const mockStream = {} as MediaStream;
      mockStreamManager.initStream.mockResolvedValue(mockStream);
      mockAudioProcessor.processAudioStream.mockReturnValue(mockStream);
      mockStream.getAudioTracks = jest.fn().mockReturnValue([]);

      // Initialize
      await recastra.init();

      // Verify that initStream was called with default constraints
      expect(mockStreamManager.initStream).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: true
      });
    });

    it('should initialize with custom constraints', async () => {
      // Mock the initStream method
      const mockStream = {} as MediaStream;
      mockStreamManager.initStream.mockResolvedValue(mockStream);
      mockAudioProcessor.processAudioStream.mockReturnValue(mockStream);
      mockStream.getAudioTracks = jest.fn().mockReturnValue([]);

      // Custom constraints
      const constraints = {
        audio: { deviceId: 'test-audio' },
        video: { width: 1280, height: 720 }
      };

      // Initialize
      await recastra.init(constraints);

      // Verify that initStream was called with custom constraints
      expect(mockStreamManager.initStream).toHaveBeenCalledWith(constraints);
    });

    it('should process audio stream if there are audio tracks', async () => {
      // Mock the initStream method
      const mockStream = {} as MediaStream;
      mockStreamManager.initStream.mockResolvedValue(mockStream);
      mockAudioProcessor.processAudioStream.mockReturnValue(mockStream);
      mockStream.getAudioTracks = jest.fn().mockReturnValue([{}]);

      // Initialize
      await recastra.init();

      // Verify that processAudioStream was called
      expect(mockAudioProcessor.processAudioStream).toHaveBeenCalledWith(mockStream);
    });

    it('should throw error if initialization fails', async () => {
      // Mock the initStream method to throw an error
      mockStreamManager.initStream.mockRejectedValue(new Error('Permission denied'));

      // Initialize
      await expect(recastra.init()).rejects.toThrow('Failed to initialize');
    });
  });

  describe('setMimeType', () => {
    it('should set MIME type', () => {
      // Set MIME type
      recastra.setMimeType('audio/webm');

      // Verify that setMimeType was called on the recording manager
      expect(mockRecordingManager.setMimeType).toHaveBeenCalledWith('audio/webm');
    });
  });

  describe('setAudioGain', () => {
    it('should set audio gain', async () => {
      // Set audio gain
      await recastra.setAudioGain(1.5);

      // Verify that setAudioGain was called on the audio processor
      expect(mockAudioProcessor.setAudioGain).toHaveBeenCalledWith(1.5);
    });

    it('should reprocess stream if there are audio tracks', async () => {
      // Mock the getStream method
      const mockStream = {} as MediaStream;
      mockStreamManager.getStream.mockReturnValue(mockStream);
      mockStream.getAudioTracks = jest.fn().mockReturnValue([{}]);
      mockAudioProcessor.processAudioStream.mockReturnValue(mockStream);
      mockRecordingManager.getState.mockReturnValue('inactive');

      // Set audio gain
      await recastra.setAudioGain(1.5);

      // Verify that processAudioStream was called
      expect(mockAudioProcessor.processAudioStream).toHaveBeenCalledWith(mockStream);
      expect(mockStreamManager.updateStream).toHaveBeenCalled();
    });

    it('should restart recording if it was recording', async () => {
      // Mock the getStream method
      const mockStream = {} as MediaStream;
      mockStreamManager.getStream.mockReturnValue(mockStream);
      mockStream.getAudioTracks = jest.fn().mockReturnValue([{}]);
      mockAudioProcessor.processAudioStream.mockReturnValue(mockStream);
      mockRecordingManager.getState.mockReturnValue('recording');

      // Set audio gain
      await recastra.setAudioGain(1.5);

      // Verify that recording was restarted
      expect(mockRecordingManager.stop).toHaveBeenCalled();
      expect(mockRecordingManager.start).toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('should start recording', () => {
      // Mock the getStream method
      const mockStream = {} as MediaStream;
      mockStreamManager.getStream.mockReturnValue(mockStream);

      // Start recording
      recastra.start();

      // Verify that start was called on the recording manager
      expect(mockRecordingManager.start).toHaveBeenCalledWith(mockStream);
    });

    it('should throw error if stream is not initialized', () => {
      // Mock the getStream method to return null
      mockStreamManager.getStream.mockReturnValue(null);

      // Start recording
      expect(() => recastra.start()).toThrow('Stream not initialized');
    });
  });

  describe('stop', () => {
    it('should stop recording and return blob', async () => {
      // Mock the stop method
      const mockBlob = new Blob(['test data']);
      mockRecordingManager.stop.mockResolvedValue(mockBlob);

      // Stop recording
      const blob = await recastra.stop();

      // Verify that stop was called on the recording manager
      expect(mockRecordingManager.stop).toHaveBeenCalled();
      expect(blob).toBe(mockBlob);
    });
  });

  describe('updateStream', () => {
    it('should update stream with new constraints', async () => {
      // Mock the updateStream method
      const mockStream = {} as MediaStream;
      mockStreamManager.updateStream.mockResolvedValue(mockStream);
      mockStream.getAudioTracks = jest.fn().mockReturnValue([]);
      mockRecordingManager.getState.mockReturnValue('inactive');

      // Update stream
      const constraints = { audio: true, video: false };
      await recastra.updateStream(constraints);

      // Verify that updateStream was called with the correct constraints
      expect(mockStreamManager.updateStream).toHaveBeenCalledWith(constraints, true);
    });

    it('should restart recording if it was recording', async () => {
      // Mock the updateStream method
      const mockStream = {} as MediaStream;
      mockStreamManager.updateStream.mockResolvedValue(mockStream);
      mockStream.getAudioTracks = jest.fn().mockReturnValue([]);
      mockRecordingManager.getState.mockReturnValue('recording');

      // Update stream
      const constraints = { audio: true, video: false };
      await recastra.updateStream(constraints);

      // Verify that recording was restarted
      expect(mockRecordingManager.stop).toHaveBeenCalled();
      expect(mockRecordingManager.start).toHaveBeenCalled();
    });
  });

  describe('getStream', () => {
    it('should return the current stream', () => {
      // Mock the getStream method
      const mockStream = {} as MediaStream;
      mockStreamManager.getStream.mockReturnValue(mockStream);

      // Get stream
      const stream = recastra.getStream();

      // Verify that getStream was called on the stream manager
      expect(mockStreamManager.getStream).toHaveBeenCalled();
      expect(stream).toBe(mockStream);
    });

    it('should throw error if stream is not initialized', () => {
      // Mock the getStream method to return null
      mockStreamManager.getStream.mockReturnValue(null);

      // Get stream
      expect(() => recastra.getStream()).toThrow('Stream not initialized');
    });
  });

  describe('pause and resume', () => {
    it('should pause recording', () => {
      // Pause recording
      recastra.pause();

      // Verify that pause was called on the recording manager
      expect(mockRecordingManager.pause).toHaveBeenCalled();
    });

    it('should resume recording', () => {
      // Resume recording
      recastra.resume();

      // Verify that resume was called on the recording manager
      expect(mockRecordingManager.resume).toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('should save the recording', () => {
      // Mock the getRecordingBlob method
      const mockBlob = new Blob(['test data']);
      mockRecordingManager.getRecordingBlob.mockReturnValue(mockBlob);
      mockRecordingManager.getState.mockReturnValue('inactive');

      // Save the recording
      recastra.save('test.webm');

      // Verify that save was called on the file manager
      expect(mockFileManager.save).toHaveBeenCalledWith(mockBlob, 'video/webm', 'test.webm');
    });

    it('should throw error if no recording is available', () => {
      // Mock the getRecordingBlob method to return null
      mockRecordingManager.getRecordingBlob.mockReturnValue(null);

      // Save the recording
      expect(() => recastra.save()).toThrow('No recording available');
    });
  });

  describe('saveAsAudio', () => {
    it('should save the recording as audio', () => {
      // Mock the getRecordingBlob method
      const mockBlob = new Blob(['test data']);
      mockRecordingManager.getRecordingBlob.mockReturnValue(mockBlob);

      // Save the recording as audio
      recastra.saveAsAudio('test-audio.wav');

      // Verify that saveAsAudio was called on the file manager
      expect(mockFileManager.saveAsAudio).toHaveBeenCalledWith(mockBlob, 'test-audio.wav');
    });

    it('should throw error if no recording is available', () => {
      // Mock the getRecordingBlob method to return null
      mockRecordingManager.getRecordingBlob.mockReturnValue(null);

      // Save the recording as audio
      expect(() => recastra.saveAsAudio()).toThrow('No recording available');
    });
  });

  describe('upload', () => {
    it('should upload the recording to a server', async () => {
      // Mock the getRecordingBlob method
      const mockBlob = new Blob(['test data']);
      mockRecordingManager.getRecordingBlob.mockReturnValue(mockBlob);

      // Mock the upload method
      const mockResponse = {} as Response;
      mockFileManager.upload.mockResolvedValue(mockResponse);

      // Upload the recording
      const response = await recastra.upload('https://example.com/upload', 'file');

      // Verify that upload was called on the file manager
      expect(mockFileManager.upload).toHaveBeenCalledWith(
        mockBlob,
        'https://example.com/upload',
        'file'
      );
      expect(response).toBe(mockResponse);
    });

    it('should throw error if no recording is available', async () => {
      // Mock the getRecordingBlob method to return null
      mockRecordingManager.getRecordingBlob.mockReturnValue(null);

      // Upload the recording
      await expect(recastra.upload('https://example.com/upload')).rejects.toThrow(
        'No recording available'
      );
    });
  });

  describe('getAudioDevices and getVideoDevices', () => {
    it('should get audio devices', async () => {
      // Mock the getAudioDevices method
      const mockDevices = [{ kind: 'audioinput' }] as MediaDeviceInfo[];
      mockStreamManager.getAudioDevices.mockResolvedValue(mockDevices);

      // Get audio devices
      const devices = await recastra.getAudioDevices();

      // Verify that getAudioDevices was called on the stream manager
      expect(mockStreamManager.getAudioDevices).toHaveBeenCalled();
      expect(devices).toBe(mockDevices);
    });

    it('should get video devices', async () => {
      // Mock the getVideoDevices method
      const mockDevices = [{ kind: 'videoinput' }] as MediaDeviceInfo[];
      mockStreamManager.getVideoDevices.mockResolvedValue(mockDevices);

      // Get video devices
      const devices = await recastra.getVideoDevices();

      // Verify that getVideoDevices was called on the stream manager
      expect(mockStreamManager.getVideoDevices).toHaveBeenCalled();
      expect(devices).toBe(mockDevices);
    });
  });

  describe('dispose', () => {
    it('should dispose of all resources', () => {
      // Dispose
      recastra.dispose();

      // Verify that dispose was called on all component managers
      expect(mockStreamManager.dispose).toHaveBeenCalled();
      expect(mockAudioProcessor.dispose).toHaveBeenCalled();
      expect(mockRecordingManager.dispose).toHaveBeenCalled();
    });
  });
});
