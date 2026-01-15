import { setGlobalOptions } from "firebase-functions";
import { onObjectFinalized } from 'firebase-functions/storage';
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import { backfill } from './backfill';

initializeApp();

setGlobalOptions({maxInstances: 1});

function getPublicUrl(bucket: string, fileName: string) {
  return `https://storage.googleapis.com/${bucket}/${fileName}`;
}

enum Community {
  MINAWAN = 'minawan',
  GOOMER = 'goomer',
  MINYAN = 'minyan',
  WORMPAL = 'wormpal'
}

const communityChannels: { [key in Community]: string } = {
  minawan: 'cerbervt',
  goomer: 'gomi',
  minyan: 'minikomew',
  wormpal: 'chrchie'
};

export const updateJsonCatalog = onObjectFinalized({bucket: "minawan-pics.firebasestorage.app"}, async (event) => {
  const pathParts = event.data.name.split('/');
  if (pathParts.length !== 3) return;

  const community = pathParts[0] as Community;
  const fileName = pathParts[2];

  if (fileName !== 'minasona.png') return;
  if (!Object.values(Community).includes(community)) return;

  const storage = getStorage();
  const db = getFirestore();
  const bucket = storage.bucket(event.bucket);

  // 1. Get all minasona.png files in the bucket
  // Note all communities use minasona.png, this is a legacy design factor.
  const [files] = await bucket.getFiles({prefix: `${community}/`});
  const sonaFiles = files.filter(f => f.name.endsWith('/minasona.png'));

  const catalog = [];

  for (const file of sonaFiles) {
    const pathParts = file.name.split('/');
    // Expecting {community}/{userId}/minasona.png
    if (pathParts.length !== 3 || pathParts[0] !== community) continue;

    const userId = pathParts[1];

    // 2. Match file names to extract userId and match to firestore documents at /minawan/{userId}
    // Note: all communities use the minawan collection, this is a legacy design factor.
    const userDoc = await db.collection('minawan').doc(userId).get();
    const twitchUsername = userDoc.exists ? userDoc.data()?.twitchUsername : undefined;

    // Ensure minasona.png is public (assuming others are too as they are created together)
    const [isPublic] = await file.isPublic();
    if (!isPublic) {
      await file.makePublic();
      await file.setMetadata({cacheControl: 'Cache-Control:public, max-age=3600, s-maxage=600'});
    }

    // 3. Generate a JSON list of the community sona
    // where the object fields are the publicly accessible URL for the respective image
    const entry: any = {
      id: userId,
      twitchUsername,
      original: getPublicUrl(event.bucket, file.name),
      avif256: getPublicUrl(event.bucket, `${community}/${userId}/minasona_256x256.avif`),
      png256: getPublicUrl(event.bucket, `${community}/${userId}/minasona_256x256.png`),
      avif512: getPublicUrl(event.bucket, `${community}/${userId}/minasona_512x512.avif`),
      png512: getPublicUrl(event.bucket, `${community}/${userId}/minasona_512x512.png`),
      avif64: getPublicUrl(event.bucket, `${community}/${userId}/minasona_64x64.avif`),
      png64: getPublicUrl(event.bucket, `${community}/${userId}/minasona_64x64.png`)
    };

    catalog.push(entry);
  }

  if (community === Community.MINAWAN) {
    for (const backfillEntry of backfill) {
      if (!catalog.some((entry) => entry.twitchUsername === backfillEntry.twitchUsername)) {
        catalog.push({
          backfill: true,
          twitchUsername: backfillEntry.twitchUsername,
          original: getPublicUrl(event.bucket, `minawan-backfill/${backfillEntry.minasonaName}.webp`),
          avif256: getPublicUrl(event.bucket, `minawan-backfill/${backfillEntry.minasonaName}_256x256.avif`),
          png256: getPublicUrl(event.bucket, `minawan-backfill/${backfillEntry.minasonaName}_256x256.png`),
          avif512: getPublicUrl(event.bucket, `minawan-backfill/${backfillEntry.minasonaName}_512x512.avif`),
          png512: getPublicUrl(event.bucket, `minawan-backfill/${backfillEntry.minasonaName}_512x512.png`),
          avif64: getPublicUrl(event.bucket, `minawan-backfill/${backfillEntry.minasonaName}_64x64.avif`),
          png64: getPublicUrl(event.bucket, `minawan-backfill/${backfillEntry.minasonaName}_64x64.png`)
        });
      }
    }
  }

  // 4. Upload the JSON file to the bucket at /{community}/api.json
  const galleryFile = bucket.file(`${community}/api.json`)
  await galleryFile.save(JSON.stringify(catalog), {
    contentType: 'application/json',
    public: true,
    metadata: {
      cacheControl: 'public, max-age=0, s-maxage=0',
    }
  });

  // 5. Fetch all community api.json files and compose them into a root api.json
  const combinedGalleries: { [key: string]: any[] } = {};

  for (const comm of Object.values(Community)) {
    const communityGalleryFile = bucket.file(`${comm}/api.json`);
    try {
      const [exists] = await communityGalleryFile.exists();
      if (exists) {
        const [contents] = await communityGalleryFile.download();
        const communityGallery = JSON.parse(contents.toString());
        const channelName = communityChannels[comm];
        combinedGalleries[channelName] = communityGallery;
      }
    } catch (error) {
      console.error(`Could not fetch gallery for ${comm}:`, error);
    }
  }

  // 6. Upload the combined api.json to the root of the bucket
  const rootGalleryFile = bucket.file('api.json');
  await rootGalleryFile.save(JSON.stringify(combinedGalleries), {
    contentType: 'application/json',
    public: true,
    metadata: {
      cacheControl: 'public, max-age=0, s-maxage=0',
    }
  });
});

export const updateJsonCatalogLegacy = onObjectFinalized({bucket: "minawan-pics.firebasestorage.app"}, async (event) => {
  if (!event.data.name.endsWith('/minasona.png')) return;

  const storage = getStorage();
  const db = getFirestore();
  const bucket = storage.bucket(event.bucket);

  // 1. Get all minasona.png files in the bucket
  const [files] = await bucket.getFiles({prefix: 'minawan/'});
  const minasonaFiles = files.filter(f => f.name.endsWith('/minasona.png'));

  const catalog = [];

  for (const file of minasonaFiles) {
    const pathParts = file.name.split('/');
    // Expecting minawan/{userId}/minasona.png
    if (pathParts.length !== 3 || pathParts[0] !== 'minawan') continue;

    const userId = pathParts[1];

    // 2. Match file names to extract userId and match to firestore documents at /minawan/{userId}
    const userDoc = await db.collection('minawan').doc(userId).get();
    const twitchUsername = userDoc.exists ? userDoc.data()?.twitchUsername : undefined;

    // Ensure minasona.png is public (assuming others are too as they are created together)
    const [isPublic] = await file.isPublic();
    if (!isPublic) {
      await file.makePublic();
      await file.setMetadata({cacheControl: 'Cache-Control:public, max-age=3600, s-maxage=600'});
    }

    // 3. Generate a JSON list of {id, twitchUsername, minasona, minasona_(format)_256, minasona_(format)_512, minasona_(format)_64}
    // where the minasona fields are the match publicly accessible URL for the respective image
    const entry: any = {
      id: userId,
      twitchUsername,
      minasona: getPublicUrl(event.bucket, file.name),
      minasonaAvif256: getPublicUrl(event.bucket, `minawan/${userId}/minasona_256x256.avif`),
      minasonaPng256: getPublicUrl(event.bucket, `minawan/${userId}/minasona_256x256.png`),
      minasonaAvif512: getPublicUrl(event.bucket, `minawan/${userId}/minasona_512x512.avif`),
      minasonaPng512: getPublicUrl(event.bucket, `minawan/${userId}/minasona_512x512.png`),
      minasonaAvif64: getPublicUrl(event.bucket, `minawan/${userId}/minasona_64x64.avif`),
      minasonaPng64: getPublicUrl(event.bucket, `minawan/${userId}/minasona_64x64.png`)
    };

    catalog.push(entry);
  }

  for (const backfillEntry of backfill) {
    if (!catalog.some((entry) => entry.twitchUsername === backfillEntry.twitchUsername)) {
      catalog.push({
        backfill: true,
        twitchUsername: backfillEntry.twitchUsername,
        minasona: getPublicUrl(event.bucket, `minawan-backfill/${backfillEntry.minasonaName}.webp`),
        minasonaAvif256: getPublicUrl(event.bucket, `minawan-backfill/${backfillEntry.minasonaName}_256x256.avif`),
        minasonaPng256: getPublicUrl(event.bucket, `minawan-backfill/${backfillEntry.minasonaName}_256x256.png`),
        minasonaAvif512: getPublicUrl(event.bucket, `minawan-backfill/${backfillEntry.minasonaName}_512x512.avif`),
        minasonaPng512: getPublicUrl(event.bucket, `minawan-backfill/${backfillEntry.minasonaName}_512x512.png`),
        minasonaAvif64: getPublicUrl(event.bucket, `minawan-backfill/${backfillEntry.minasonaName}_64x64.avif`),
        minasonaPng64: getPublicUrl(event.bucket, `minawan-backfill/${backfillEntry.minasonaName}_64x64.png`)
      });
    }
  }

  // 4. Upload the json file to the bucket at /minawan/gallery.json
  const galleryFile = bucket.file('minawan/gallery.json')
  await galleryFile.save(JSON.stringify(catalog), {
    contentType: 'application/json',
    public: true,
    metadata: {
      cacheControl: 'public, max-age=0, s-maxage=0',
    }
  });
});
