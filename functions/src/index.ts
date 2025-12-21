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
};

export const updateJsonCatalog = onObjectFinalized({bucket: "minawan-pics.firebasestorage.app"}, async (event) => {
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
