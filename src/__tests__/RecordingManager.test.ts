import { RecordingManager } from '../core/RecordingManager';
import * as validationUtils from '../utils/validation';
import * as recorderUtils from '../utils/recorder';

describe('RecordingManager', () => {
  let recordingManager: RecordingManager;

  beforeEach(() => {
    recordingManager = new RecordingManager();
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock utility functions
    jest.spyOn(validationUtils, 'validateStream').mockImplementation(() => {});
    jest
      .spyOn(recorderUtils, 'createOptimizedRecorder')
      .mockImplementation((_stream, _mimeType, _options, _audioOnly) => {
        return {
          start: jest.fn(),
          stop: jest.fn(),
          requestData: jest.fn(),
          state: 'inactive',
          ondataavailable: null,
          onerror: null,
          onstop: null,
          pause: jest.fn(),
          resume: jest.fn()
        } as unknown as MediaRecorder;
      });
    jest
      .spyOn(recorderUtils, 'setupRecordingHeartbeat')
      .mockImplementation(() => 123 as unknown as ReturnType<typeof setInterval>);
    jest
      .spyOn(recorderUtils, 'stopRecorderWithTimeout')
      .mockImplementation(() => Promise.resolve(new Blob(['test data'])));
  });

  afterEach(() => {
    // Clean up after each test
    recordingManager.dispose();
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      expect(recordingManager).toBeInstanceOf(RecordingManager);
      expect(recordingManager['mimeType']).toBe('video/webm'); // Default MIME type
    });

    it('should set mimeType from options', () => {
      const customManager = new RecordingManager({ mimeType: 'audio/webm' });
      expect(customManager['mimeType']).toBe('audio/webm');
    });

    it('should set recordingOptions from options', () => {
      const options = { audioBitsPerSecond: 128000 };
      const customManager = new RecordingManager({ recordingOptions: options });
      expect(customManager['recordingOptions']).toEqual(options);
    });

    it('should set audioOnly from options and update mimeType', () => {
      const customManager = new RecordingManager({ audioOnly: true });
      expect(customManager['audioOnly']).toBe(true);
      expect(customManager['mimeType']).toBe('audio/webm');
    });
  });

  describe('setMimeType', () => {
    it('should set mimeType if supported', () => {
      recordingManager.setMimeType('audio/webm');
      expect(recordingManager['mimeType']).toBe('audio/webm');
    });

    it('should not change mimeType if not supported', () => {
      const originalMimeType = recordingManager['mimeType'];
      recordingManager.setMimeType('unsupported/type');
      expect(recordingManager['mimeType']).toBe(originalMimeType);
    });
  });

  describe('start', () => {
    it('should start recording', () => {
      // Create a mock stream
      const mockStream = {} as MediaStream;

      // Create a mock MediaRecorder
      const mockMediaRecorder = {
        start: jest.fn(),
        stop: jest.fn(),
        requestData: jest.fn(),
        state: 'inactive',
        ondataavailable: null,
        onerror: null,
        onstop: null,
        pause: jest.fn(),
        resume: jest.fn()
      } as unknown as MediaRecorder;

      // Mock createOptimizedRecorder to return our mock
      jest.spyOn(recorderUtils, 'createOptimizedRecorder').mockReturnValue(mockMediaRecorder);

      // Start recording
      recordingManager.start(mockStream);

      // Verify that validateStream was called
      expect(validationUtils.validateStream).toHaveBeenCalledWith(
        mockStream,
        'Stream not provided. Provide a valid MediaStream.'
      );

      // Verify that createOptimizedRecorder was called with the correct parameters
      expect(recorderUtils.createOptimizedRecorder).toHaveBeenCalledWith(
        mockStream,
        'video/webm',
        {},
        false
      );

      // Verify that the MediaRecorder was started
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(100);
    });

    it('should throw error if stream is not provided', () => {
      // Mock validateStream to throw an error
      jest.spyOn(validationUtils, 'validateStream').mockImplementation(() => {
        throw new Error('Stream not provided. Provide a valid MediaStream.');
      });

      expect(() => recordingManager.start(null as unknown as MediaStream)).toThrow(
        'Stream not provided'
      );
    });
  });

  describe('stop', () => {
    it('should stop recording and return blob', async () => {
      // Create a mock MediaRecorder
      const mockMediaRecorder = {
        state: 'recording',
        stop: jest.fn(),
        requestData: jest.fn(),
        ondataavailable: null,
        onerror: null,
        onstop: null
      } as unknown as MediaRecorder;
      recordingManager['mediaRecorder'] = mockMediaRecorder;

      // Create mock chunks
      const mockChunks = [new Blob(['test data'])];
      recordingManager['chunks'] = mockChunks;

      // Create a mock blob
      const mockBlob = new Blob(['test data']);

      // Mock stopRecorderWithTimeout to return our mock blob
      jest.spyOn(recorderUtils, 'stopRecorderWithTimeout').mockResolvedValue(mockBlob);

      // Stop recording
      const blob = await recordingManager.stop();

      // Verify that stopRecorderWithTimeout was called with the correct parameters
      expect(recorderUtils.stopRecorderWithTimeout).toHaveBeenCalledWith(
        mockMediaRecorder,
        mockChunks,
        'video/webm'
      );

      // Verify that a blob was returned
      expect(blob).toBe(mockBlob);
      expect(recordingManager['recordingBlob']).toBe(mockBlob);
    });

    it('should reject if recording is not in progress', async () => {
      recordingManager['mediaRecorder'] = { state: 'inactive' } as any;
      await expect(recordingManager.stop()).rejects.toThrow('Recording not in progress');
    });

    it('should reject if no data is collected', async () => {
      // Create a mock MediaRecorder
      const mockMediaRecorder = {
        state: 'recording',
        stop: jest.fn(),
        requestData: jest.fn(),
        ondataavailable: null,
        onerror: null,
        onstop: null
      } as unknown as MediaRecorder;
      recordingManager['mediaRecorder'] = mockMediaRecorder;

      // Empty chunks
      recordingManager['chunks'] = [];

      // Mock stopRecorderWithTimeout to reject
      jest
        .spyOn(recorderUtils, 'stopRecorderWithTimeout')
        .mockRejectedValue(new Error('No data collected during recording'));

      // Wait for the promise to reject
      await expect(recordingManager.stop()).rejects.toThrow('No data collected during recording');
    });
  });

  describe('pause and resume', () => {
    it('should pause recording', () => {
      // Create a mock MediaRecorder
      const mockMediaRecorder = {
        state: 'recording',
        pause: jest.fn(),
        stop: jest.fn(),
        requestData: jest.fn(),
        ondataavailable: null,
        onerror: null,
        onstop: null,
        resume: jest.fn()
      } as unknown as MediaRecorder;
      recordingManager['mediaRecorder'] = mockMediaRecorder;

      // Pause recording
      recordingManager.pause();

      // Verify that pause was called
      expect(mockMediaRecorder.pause).toHaveBeenCalled();
    });

    it('should not pause if not recording', () => {
      // Create a mock MediaRecorder
      const mockMediaRecorder = {
        state: 'inactive',
        pause: jest.fn(),
        stop: jest.fn(),
        requestData: jest.fn(),
        ondataavailable: null,
        onerror: null,
        onstop: null,
        resume: jest.fn()
      } as unknown as MediaRecorder;
      recordingManager['mediaRecorder'] = mockMediaRecorder;

      // Mock validateRecorderState to throw an error
      jest.spyOn(validationUtils, 'validateRecorderState').mockImplementation(() => {
        throw new Error('Cannot pause: not recording');
      });

      // Pause recording
      recordingManager.pause();

      // Verify that pause was not called
      expect(mockMediaRecorder.pause).not.toHaveBeenCalled();
    });

    it('should resume recording', () => {
      // Create a mock MediaRecorder
      const mockMediaRecorder = {
        state: 'paused',
        resume: jest.fn(),
        stop: jest.fn(),
        requestData: jest.fn(),
        ondataavailable: null,
        onerror: null,
        onstop: null,
        pause: jest.fn()
      } as unknown as MediaRecorder;
      recordingManager['mediaRecorder'] = mockMediaRecorder;

      // Reset the validateRecorderState mock to not throw an error
      jest.spyOn(validationUtils, 'validateRecorderState').mockImplementation(() => {});

      // Resume recording
      recordingManager.resume();

      // Verify that validateRecorderState was called with the correct parameters
      expect(validationUtils.validateRecorderState).toHaveBeenCalledWith(
        mockMediaRecorder,
        'paused',
        'Cannot resume: not paused'
      );

      // Verify that resume was called
      expect(mockMediaRecorder.resume).toHaveBeenCalled();
    });

    it('should not resume if not paused', () => {
      // Create a mock MediaRecorder
      const mockMediaRecorder = {
        state: 'recording',
        resume: jest.fn(),
        stop: jest.fn(),
        requestData: jest.fn(),
        ondataavailable: null,
        onerror: null,
        onstop: null,
        pause: jest.fn()
      } as unknown as MediaRecorder;
      recordingManager['mediaRecorder'] = mockMediaRecorder;

      // Mock validateRecorderState to throw an error
      jest.spyOn(validationUtils, 'validateRecorderState').mockImplementation(() => {
        throw new Error('Cannot resume: not paused');
      });

      // Resume recording
      recordingManager.resume();

      // Verify that resume was not called
      expect(mockMediaRecorder.resume).not.toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('should return the current recording state', () => {
      // Create a mock MediaRecorder
      const mockMediaRecorder = {
        state: 'recording',
        stop: jest.fn(),
        requestData: jest.fn(),
        ondataavailable: null,
        onerror: null,
        onstop: null,
        pause: jest.fn(),
        resume: jest.fn()
      } as unknown as MediaRecorder;
      recordingManager['mediaRecorder'] = mockMediaRecorder;

      // Get state
      const state = recordingManager.getState();

      // Verify that the correct state was returned
      expect(state).toBe('recording');
    });

    it('should return inactive if no MediaRecorder exists', () => {
      recordingManager['mediaRecorder'] = null;

      // Get state
      const state = recordingManager.getState();

      // Verify that inactive was returned
      expect(state).toBe('inactive');
    });
  });

  describe('getRecordingBlob', () => {
    it('should return the recording blob', () => {
      // Create a mock blob
      const mockBlob = new Blob(['test data']);
      recordingManager['recordingBlob'] = mockBlob;

      // Get recording blob
      const blob = recordingManager.getRecordingBlob();

      // Verify that the correct blob was returned
      expect(blob).toBe(mockBlob);
    });
  });

  describe('getChunks', () => {
    it('should return the recorded chunks', () => {
      // Create mock chunks
      const mockChunks = [new Blob(['test data'])];
      recordingManager['chunks'] = mockChunks;

      // Get chunks
      const chunks = recordingManager.getChunks();

      // Verify that the correct chunks were returned
      expect(chunks).toBe(mockChunks);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      // Create mock resources
      recordingManager['mediaRecorder'] = {} as any;
      recordingManager['chunks'] = [new Blob(['test data'])];
      recordingManager['recordingBlob'] = new Blob(['test data']);

      // Dispose
      recordingManager.dispose();

      // Verify that resources were cleaned up
      expect(recordingManager['mediaRecorder']).toBeNull();
      expect(recordingManager['chunks']).toEqual([]);
      expect(recordingManager['recordingBlob']).toBeNull();
    });
  });
});
