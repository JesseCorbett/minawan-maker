import fft from 'firebase-functions-test';

// Mocking firebase-admin
const mockDoc = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(),
  exists: true,
  data: jest.fn(),
  id: 'mock-doc-id',
  collection: jest.fn(),
};
// @ts-ignore
mockDoc.ref = { delete: jest.fn() };

const mockCollection = {
  doc: jest.fn(() => mockDoc),
  get: jest.fn(),
};

mockDoc.collection.mockReturnValue(mockCollection);

const mockFirestore = {
  collection: jest.fn(() => mockCollection),
};

const mockBucket = {
  getFiles: jest.fn(),
  file: jest.fn(),
  deleteFiles: jest.fn(),
};

const mockStorage = {
  bucket: jest.fn(() => mockBucket),
};

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => mockFirestore),
}));

jest.mock('firebase-admin', () => ({
  firestore: {
    FieldValue: {
      arrayUnion: jest.fn((val) => ({ type: 'arrayUnion', val })),
      arrayRemove: jest.fn((val) => ({ type: 'arrayRemove', val })),
    },
  },
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

// Mock webhook utils
jest.mock('../src/moderation/webhookUtils', () => ({
  sendReviewWebhook: jest.fn().mockResolvedValue('msg-id'),
  deleteWebhookMessage: jest.fn().mockResolvedValue(true),
  updateWebhookMessageToApproved: jest.fn().mockResolvedValue(true),
}));

// Now import the functions
import { 
  updateJsonCatalog, 
  markUserForReview, 
  moderationDeleteImage, 
  moderationApproveImage,
  rebuildCatalog,
  updateJsonCatalogLegacy 
} from '../src/index';
import { Community } from '../src/communities';

const testEnv = fft();

describe('updateJsonCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock setup for firestore
    mockDoc.get.mockResolvedValue({
      exists: true,
      data: () => ({ twitchUsername: 'user1_twitch' }),
    });
  });

  it('should exit early if path parts are not 3', async () => {
    const event = {
      data: { name: 'too/many/parts/here.png' },
      bucket: 'test-bucket',
    };
    await updateJsonCatalog(event as any);
    expect(mockFirestore.collection).not.toHaveBeenCalled();
  });

  it('should exit early if fileName is not minasona.png', async () => {
    const event = {
      data: { name: 'minawan/user1/other.png' },
      bucket: 'test-bucket',
    };
    await updateJsonCatalog(event as any);
    expect(mockFirestore.collection).not.toHaveBeenCalled();
  });

  it('should process a valid community update and handle backfill', async () => {
    const community = 'minawan';
    const userId = 'user1';
    const event = {
      data: { name: `${community}/${userId}/minasona.png` },
      bucket: 'test-bucket',
    };

    const mockFile = {
      name: `${community}/${userId}/minasona.png`,
      isPublic: jest.fn().mockResolvedValue([true]),
      makePublic: jest.fn(),
      setMetadata: jest.fn(),
    };

    mockBucket.getFiles.mockResolvedValue([[mockFile]]);

    const mockGalleryFile = {
      save: jest.fn().mockResolvedValue(null),
      exists: jest.fn().mockResolvedValue([true]),
      download: jest.fn().mockResolvedValue([Buffer.from(JSON.stringify([]))]),
    };
    mockBucket.file.mockReturnValue(mockGalleryFile);

    await updateJsonCatalog(event as any);

    // Verify it updated user doc to set community to false
    expect(mockDoc.update).toHaveBeenCalledWith({ [community]: false });

    // Verify it fetched files for the community
    expect(mockBucket.getFiles).toHaveBeenCalledWith({ prefix: `${community}/` });

    // Verify it saved community gallery with backfill (since it's minawan)
    expect(mockBucket.file).toHaveBeenCalledWith(`${community}/api.json`);
    const communitySaveCall = mockGalleryFile.save.mock.calls.find(call => {
      const data = JSON.parse(call[0]);
      return Array.isArray(data) && data.some(entry => entry.backfill === true);
    });
    expect(communitySaveCall).toBeDefined();

    // Verify it processed combined gallery
    expect(mockBucket.file).toHaveBeenCalledWith('api.json');
  });
});

describe('markUserForReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.get.mockResolvedValue({
      exists: true,
      data: () => ({ twitchUsername: 'user1_twitch' }),
    });
    mockCollection.get.mockResolvedValue({ docs: [] });
  });

  it('should send webhooks and update approvals for valid image upload', async () => {
    const community = 'minawan';
    const userId = 'user1';
    const event = {
      data: { name: `${community}/${userId}/minasona_256x256.png` },
      bucket: 'test-bucket',
    };

    await markUserForReview(event as any);

    // Should remove from approvals
    expect(mockFirestore.collection).toHaveBeenCalledWith('approvals');
    expect(mockCollection.doc).toHaveBeenCalledWith(community);
    expect(mockDoc.set).toHaveBeenCalledWith({
      approvedUsers: expect.objectContaining({ type: 'arrayRemove', val: userId })
    });

    // Should handle webhooks
    const { sendReviewWebhook } = require('../src/moderation/webhookUtils');
    expect(sendReviewWebhook).toHaveBeenCalled();
  });

  it('should delete previous webhooks', async () => {
    const community = 'minawan';
    const userId = 'user1';
    const event = {
      data: { name: `${community}/${userId}/minasona_256x256.png` },
      bucket: 'test-bucket',
    };

    const mockOldDoc = {
      data: () => ({ webhook: 'http://old.webhook', messageId: 'old-msg-id' }),
      ref: { delete: jest.fn() }
    };
    mockCollection.get.mockResolvedValue({ docs: [mockOldDoc] });

    await markUserForReview(event as any);

    const { deleteWebhookMessage } = require('../src/moderation/webhookUtils');
    expect(deleteWebhookMessage).toHaveBeenCalledWith('http://old.webhook', 'old-msg-id');
    expect(mockOldDoc.ref.delete).toHaveBeenCalled();
  });

  it('should exit early for non-moderation images', async () => {
    const event = {
      data: { name: 'minawan/user1/minasona.png' },
      bucket: 'test-bucket',
    };
    await markUserForReview(event as any);
    expect(mockFirestore.collection).not.toHaveBeenCalled();
  });
});

describe('moderationDeleteImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete files and return 200 if key is valid', async () => {
    const req = {
      query: {
        community: 'minawan',
        userId: 'user1',
        key: 'VALID_KEY',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // Mock key validation
    mockDoc.get.mockResolvedValue({ exists: true, data: () => ({}) });
    mockCollection.get.mockResolvedValue({ docs: [] });

    await moderationDeleteImage(req as any, res as any);

    expect(mockBucket.deleteFiles).toHaveBeenCalledWith({ prefix: 'minawan/user1/' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return 401 for invalid key', async () => {
    const req = {
      query: {
        community: 'minawan',
        userId: 'user1',
        key: 'INVALID_KEY',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    mockDoc.get.mockResolvedValue({ exists: false });

    await moderationDeleteImage(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(401);
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
    expect(res.send).toHaveBeenCalledWith('Missing key, community, or userId');
  });
});

describe('moderationApproveImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should approve image and return 200', async () => {
    const req = {
      query: {
        community: 'minawan',
        userId: 'user1',
        key: 'VALID_KEY',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    mockDoc.get.mockResolvedValue({ exists: true, data: () => ({}) });
    mockCollection.get.mockResolvedValue({ docs: [] });

    await moderationApproveImage(req as any, res as any);

    expect(mockFirestore.collection).toHaveBeenCalledWith('approvals');
    expect(mockDoc.set).toHaveBeenCalledWith({
      approvedUsers: expect.objectContaining({ type: 'arrayUnion', val: 'user1' })
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('rebuildCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should rebuild catalog and return 200', async () => {
    const req = {
      query: {
        community: 'minawan',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    mockDoc.get.mockResolvedValue({ exists: true, data: () => ({ approvedUsers: [] }) });
    mockBucket.getFiles.mockResolvedValue([[]]);

    await rebuildCatalog(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
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

    mockDoc.get.mockResolvedValue({
      exists: true,
      data: () => ({ twitchUsername: 'user1_twitch' }),
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
