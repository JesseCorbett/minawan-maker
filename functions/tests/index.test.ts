import fft from 'firebase-functions-test';

// Mocking firebase-admin
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
}));

const mockBucket = {
  getFiles: jest.fn(),
  file: jest.fn(),
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

// Now import the function
import { updateJsonCatalog } from '../src/index';

const testEnv = fft();

describe('updateJsonCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should exit early if fileName is not original.png', async () => {
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
        name: 'invalid/user1/original.png',
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
        name: `${community}/${userId}/original.png`,
      },
      bucket: 'test-bucket',
    };

    const mockFile = {
      name: `${community}/${userId}/original.png`,
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
    expect(mockBucket.file).toHaveBeenCalledWith(`${community}/gallery.json`);
    expect(mockGalleryFile.save).toHaveBeenCalled();

    // Verify it processed combined gallery (loops through minawan, goomer, minyan, wormpal)
    expect(mockBucket.file).toHaveBeenCalledWith('gallery.json');
    
    // Check if it saved the combined gallery
    const lastCall = mockGalleryFile.save.mock.calls[mockGalleryFile.save.mock.calls.length - 1];
    const savedData = JSON.parse(lastCall[0]);
    // The combined gallery should have the community channels as keys
    expect(savedData).toHaveProperty('cerbervt'); // minawan
  });

  it('should handle missing user document', async () => {
    const community = 'goomer';
    const userId = 'user2';
    const event = {
      specversion: '1.0',
      id: 'event-id',
      source: '/buckets/test-bucket',
      type: 'google.firebase.storage.object.v1.finalized',
      time: new Date().toISOString(),
      data: {
        name: `${community}/${userId}/original.png`,
      },
      bucket: 'test-bucket',
    };

    const mockFile = {
      name: `${community}/${userId}/original.png`,
      isPublic: jest.fn().mockResolvedValue([false]),
      makePublic: jest.fn(),
      setMetadata: jest.fn(),
    };

    mockBucket.getFiles.mockResolvedValue([[mockFile]]);

    const mockDoc = {
      exists: false,
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
      exists: jest.fn().mockResolvedValue([false]),
    };
    mockBucket.file.mockReturnValue(mockGalleryFile);

    await updateJsonCatalog(event as any);

    expect(mockFile.makePublic).toHaveBeenCalled();
    expect(mockFile.setMetadata).toHaveBeenCalled();

    const communityGalleryCall = mockGalleryFile.save.mock.calls[0];
    const communityCatalog = JSON.parse(communityGalleryCall[0]);
    expect(communityCatalog[0].twitchUsername).toBeUndefined();
  });

  it('should include backfill for minawan community', async () => {
    const community = 'minawan';
    const userId = 'user1';
    const event = {
      specversion: '1.0',
      id: 'event-id',
      source: '/buckets/test-bucket',
      type: 'google.firebase.storage.object.v1.finalized',
      time: new Date().toISOString(),
      data: {
        name: `${community}/${userId}/original.png`,
      },
      bucket: 'test-bucket',
    };

    mockBucket.getFiles.mockResolvedValue([[{
      name: `${community}/${userId}/original.png`,
      isPublic: jest.fn().mockResolvedValue([true]),
    }]]);

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
      exists: jest.fn().mockResolvedValue([false]),
    };
    mockBucket.file.mockReturnValue(mockGalleryFile);

    await updateJsonCatalog(event as any);

    const communityGalleryCall = mockGalleryFile.save.mock.calls[0];
    const communityCatalog = JSON.parse(communityGalleryCall[0]);
    
    // Check if backfill items are added
    const backfillItem = communityCatalog.find((item: any) => item.backfill === true);
    expect(backfillItem).toBeDefined();
  });
});
