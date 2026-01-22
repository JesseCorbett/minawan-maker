import fft from 'firebase-functions-test';

// Mocking firebase-admin
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
}));

const mockBucket = {
  getFiles: jest.fn(),
  file: jest.fn(),
  deleteFiles: jest.fn(),
};

const mockStorage = {
  bucket: jest.fn(() => mockBucket),
};

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

const mockFirestore = {
  collection: jest.fn(),
};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => mockFirestore),
}));

// Mock firebase-functions/params
jest.mock('firebase-functions/params', () => ({
  defineString: jest.fn((name) => ({
    value: () => {
      if (name === 'HOOPY_WEBHOOK') return 'http://hoopy.webhook';
      if (name === 'MINAWAN_WEBHOOK') return 'http://minawan.webhook';
      return name;
    },
  })),
}));

// Mock fetch for webhooks
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
}) as jest.Mock;

// Now import the functions
import { updateJsonCatalog, submitModerationWebhook, moderationDeleteImage, updateJsonCatalogLegacy } from '../src/index';
import { Community } from '../src/communities';

const testEnv = fft();

describe('updateJsonCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should exit early if fileName is not minasona.png', async () => {
    const event = {
      specversion: '1.0',
      id: 'event-id',
      source: '/buckets/test-bucket',
      type: 'google.firebase.storage.object.v1.finalized',
      time: new Date().toISOString(),
      data: {
        name: 'minawan/user1/other.png',
      },
      bucket: 'test-bucket',
    };

    await updateJsonCatalog(event as any);

    expect(mockStorage.bucket).not.toHaveBeenCalled();
  });

  it('should exit early if community is invalid', async () => {
    const event = {
      specversion: '1.0',
      id: 'event-id',
      source: '/buckets/test-bucket',
      type: 'google.firebase.storage.object.v1.finalized',
      time: new Date().toISOString(),
      data: {
        name: 'invalid/user1/minasona.png',
      },
      bucket: 'test-bucket',
    };

    await updateJsonCatalog(event as any);

    expect(mockStorage.bucket).not.toHaveBeenCalled();
  });

  it('should process a valid community update', async () => {
    const community = 'minawan';
    const userId = 'user1';
    const event = {
      specversion: '1.0',
      id: 'event-id',
      source: '/buckets/test-bucket',
      type: 'google.firebase.storage.object.v1.finalized',
      time: new Date().toISOString(),
      data: {
        name: `${community}/${userId}/minasona.png`,
      },
      bucket: 'test-bucket',
    };

    const mockFile = {
      name: `${community}/${userId}/minasona.png`,
      isPublic: jest.fn().mockResolvedValue([true]),
      makePublic: jest.fn(),
      setMetadata: jest.fn(),
    };

    mockBucket.getFiles.mockResolvedValue([[mockFile]]);

    const mockDoc = {
      exists: true,
      data: () => ({ twitchUsername: 'user1_twitch' }),
    };
    const mockDocRef = {
      get: jest.fn().mockResolvedValue(mockDoc),
    };
    const mockCollection = {
      doc: jest.fn().mockReturnValue(mockDocRef),
    };
    mockFirestore.collection.mockReturnValue(mockCollection);

    const mockGalleryFile = {
      save: jest.fn().mockResolvedValue(null),
      exists: jest.fn().mockResolvedValue([true]),
      download: jest.fn().mockResolvedValue([Buffer.from(JSON.stringify([{ id: 'user1', twitchUsername: 'user1_twitch' }]))]),
    };
    mockBucket.file.mockReturnValue(mockGalleryFile);

    await updateJsonCatalog(event as any);

    // Verify it fetched files for the community
    expect(mockBucket.getFiles).toHaveBeenCalledWith({ prefix: `${community}/` });

    // Verify it fetched user doc
    expect(mockFirestore.collection).toHaveBeenCalledWith('minawan');
    expect(mockCollection.doc).toHaveBeenCalledWith(userId);

    // Verify it saved community gallery
    expect(mockBucket.file).toHaveBeenCalledWith(`${community}/api.json`);
    expect(mockGalleryFile.save).toHaveBeenCalled();

    // Verify it processed combined gallery (loops through minawan, goomer, minyan, wormpal)
    expect(mockBucket.file).toHaveBeenCalledWith('api.json');
    
    // Check if it saved the combined gallery
    const lastCall = mockGalleryFile.save.mock.calls[mockGalleryFile.save.mock.calls.length - 1];
    const savedData = JSON.parse(lastCall[0]);
    // The combined gallery should have the community channels as keys
    expect(savedData).toHaveProperty('cerbervt'); // minawan
  });
});

describe('submitModerationWebhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send webhooks for valid image upload', async () => {
    const community = 'minawan';
    const userId = 'user1';
    const event = {
      data: {
        name: `${community}/${userId}/minasona_512x512.png`,
      },
      bucket: 'test-bucket',
    };

    const mockDoc = {
      exists: true,
      data: () => ({ twitchUsername: 'user1_twitch' }),
    };
    mockFirestore.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockDoc),
      }),
    });

    await submitModerationWebhook(event as any);

    expect(global.fetch).toHaveBeenCalledTimes(2); // One for community, one for hoopy
    
    const calls = (global.fetch as jest.Mock).mock.calls;
    expect(calls[0][0]).toContain('http://minawan.webhook');
    expect(calls[1][0]).toContain('http://hoopy.webhook');
  });

  it('should exit early for non-moderation images', async () => {
    const event = {
      data: {
        name: 'minawan/user1/minasona.png',
      },
      bucket: 'test-bucket',
    };

    await submitModerationWebhook(event as any);

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('moderationDeleteImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete files and return 200', async () => {
    const req = {
      query: {
        community: 'minawan',
        userId: 'user1',
        key: 'MODERATION_KEY', // Default name from defineString mock
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await moderationDeleteImage(req as any, res as any);

    expect(mockBucket.deleteFiles).toHaveBeenCalledWith({ prefix: 'minawan/user1/' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ message: 'Deleted files for user1 in minawan' });
  });

  it('should return 400 for missing parameters', async () => {
    const req = {
      query: {
        key: 'MODERATION_KEY',
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await moderationDeleteImage(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Missing community or userId');
  });

  it('should return 400 for invalid community', async () => {
    const req = {
      query: {
        community: 'invalid',
        userId: 'user1',
        key: 'MODERATION_KEY',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await moderationDeleteImage(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Invalid community');
  });
});

describe('updateJsonCatalogLegacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process legacy minawan updates', async () => {
    const event = {
      data: {
        name: 'minawan/user1/minasona.png',
      },
      bucket: 'test-bucket',
    };

    const mockFile = {
      name: 'minawan/user1/minasona.png',
      isPublic: jest.fn().mockResolvedValue([true]),
    };
    mockBucket.getFiles.mockResolvedValue([[mockFile]]);

    mockFirestore.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ twitchUsername: 'user1_twitch' }),
        }),
      }),
    });

    const mockGalleryFile = {
      save: jest.fn().mockResolvedValue(null),
    };
    mockBucket.file.mockReturnValue(mockGalleryFile);

    await updateJsonCatalogLegacy(event as any);

    expect(mockBucket.file).toHaveBeenCalledWith('minawan/gallery.json');
    expect(mockGalleryFile.save).toHaveBeenCalled();
  });
});
