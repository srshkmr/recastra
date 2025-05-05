import { RecordingManager } from '../core/RecordingManager';

describe('RecordingManager', () => {
  let recordingManager: RecordingManager;

  beforeEach(() => {
    recordingManager = new RecordingManager();
    // Clear all mocks before each test
    jest.clearAllMocks();
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
      const mockStream = {};

      // Mock MediaRecorder
      const mockMediaRecorder = {
        start: jest.fn(),
        ondataavailable: null,
        onerror: null,
        onstop: null
      };
      global.MediaRecorder = jest
        .fn()
        .mockImplementation(() => mockMediaRecorder) as unknown as typeof MediaRecorder;

      // Start recording
      recordingManager.start(mockStream as unknown as MediaStream);

      // Verify that MediaRecorder was created and started
      expect(global.MediaRecorder).toHaveBeenCalledWith(
        mockStream,
        expect.objectContaining({
          mimeType: 'video/webm'
        })
      );
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(100);
      expect(recordingManager['mediaRecorder']).toBe(mockMediaRecorder);
    });

    it('should throw error if stream is not provided', () => {
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
        requestData: jest.fn()
      };
      recordingManager['mediaRecorder'] = mockMediaRecorder as any;

      // Create mock chunks
      const mockChunks = [new Blob(['test data'])];
      recordingManager['chunks'] = mockChunks;

      // Create a promise to resolve when onstop is called
      const stopPromise = recordingManager.stop();

      // Simulate the onstop event
      mockMediaRecorder.onstop();

      // Wait for the promise to resolve
      const blob = await stopPromise;

      // Verify that stop was called and a blob was returned
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
      expect(mockMediaRecorder.requestData).toHaveBeenCalled();
      expect(blob).toBeInstanceOf(Blob);
      expect(recordingManager['recordingBlob']).toBe(blob);
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
        requestData: jest.fn()
      };
      recordingManager['mediaRecorder'] = mockMediaRecorder as any;

      // Empty chunks
      recordingManager['chunks'] = [];

      // Create a promise to resolve when onstop is called
      const stopPromise = recordingManager.stop();

      // Simulate the onstop event
      mockMediaRecorder.onstop();

      // Wait for the promise to reject
      await expect(stopPromise).rejects.toThrow('No data collected during recording');
    });
  });

  describe('pause and resume', () => {
    it('should pause recording', () => {
      // Create a mock MediaRecorder
      const mockMediaRecorder = {
        state: 'recording',
        pause: jest.fn()
      };
      recordingManager['mediaRecorder'] = mockMediaRecorder as any;

      // Pause recording
      recordingManager.pause();

      // Verify that pause was called
      expect(mockMediaRecorder.pause).toHaveBeenCalled();
    });

    it('should not pause if not recording', () => {
      // Create a mock MediaRecorder
      const mockMediaRecorder = {
        state: 'inactive',
        pause: jest.fn()
      };
      recordingManager['mediaRecorder'] = mockMediaRecorder as any;

      // Pause recording
      recordingManager.pause();

      // Verify that pause was not called
      expect(mockMediaRecorder.pause).not.toHaveBeenCalled();
    });

    it('should resume recording', () => {
      // Create a mock MediaRecorder
      const mockMediaRecorder = {
        state: 'paused',
        resume: jest.fn()
      };
      recordingManager['mediaRecorder'] = mockMediaRecorder as any;

      // Resume recording
      recordingManager.resume();

      // Verify that resume was called
      expect(mockMediaRecorder.resume).toHaveBeenCalled();
    });

    it('should not resume if not paused', () => {
      // Create a mock MediaRecorder
      const mockMediaRecorder = {
        state: 'recording',
        resume: jest.fn()
      };
      recordingManager['mediaRecorder'] = mockMediaRecorder as any;

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
        state: 'recording'
      };
      recordingManager['mediaRecorder'] = mockMediaRecorder as any;

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
