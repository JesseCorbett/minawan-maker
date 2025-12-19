import { setGlobalOptions } from "firebase-functions";
import { onObjectFinalized } from 'firebase-functions/storage';
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();

setGlobalOptions({maxInstances: 1});

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

        const getPublicUrl = (fileName: string) => {
            return `https://storage.googleapis.com/${event.bucket}/${fileName}`;
        };

        // Ensure minasona.png is public (assuming others are too as they are created together)
        const [isPublic] = await file.isPublic();
        if (!isPublic) {
            await file.makePublic();
            await file.setMetadata({cacheControl: 'Cache-Control:public, max-age=3600, s-maxage=600'});
        }

        // 3. Generate a json list of {twitchUsername, minasona, minasona_(format)_256, minasona_(format)_512, minasona_(format)_64}
        // where the minasona fields are the match publicly accessible URL for the respective image
        const entry: any = {
            twitchUsername,
            minasona: getPublicUrl(file.name),
            minasonaAvif256: getPublicUrl(`minawan/${userId}/minasona_256x256.avif`),
            minasonaPng256: getPublicUrl(`minawan/${userId}/minasona_256x256.png`),
            minasonaAvif512: getPublicUrl(`minawan/${userId}/minasona_512x512.avif`),
            minasonaPng512: getPublicUrl(`minawan/${userId}/minasona_512x512.png`),
            minasonaAvif64: getPublicUrl(`minawan/${userId}/minasona_64x64.avif`),
            minasonaPng64: getPublicUrl(`minawan/${userId}/minasona_64x64.png`)
        };

        catalog.push(entry);
    }

    // 4. Upload the json file to the bucket at /minawan/gallery.json
    const galleryFile = bucket.file('minawan/gallery.json')
    await galleryFile.save(JSON.stringify(catalog), {
        contentType: 'application/json',
        public: true,
        metadata: {
            cacheControl: 'public, max-age=0, s-maxage=0'
        }
    });
});
