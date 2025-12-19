import { setGlobalOptions } from "firebase-functions";
import { onObjectFinalized } from 'firebase-functions/storage';
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import * as crypto from "crypto";

initializeApp();

setGlobalOptions({ maxInstances: 1 });

export const updateJsonCatalog = onObjectFinalized({ bucket: "minawan-pics.firebasestorage.app" }, async (event) => {
    const storage = getStorage();
    const db = getFirestore();
    const bucket = storage.bucket(event.bucket);

    // 1. Get all items in the bucket at path /minawan/{userId}/*
    const [files] = await bucket.getFiles({ prefix: 'minawan/' });

    const usersData: Record<string, any> = {};

    for (const file of files) {
        const pathParts = file.name.split('/');
        // Expecting minawan/{userId}/filename
        if (pathParts.length !== 3 || pathParts[0] !== 'minawan') continue;

        const userId = pathParts[1];

        if (!usersData[userId]) {
            usersData[userId] = {
                userId,
                files: []
            };
        }
        usersData[userId].files.push(file);
    }

    const catalog = [];

    for (const userId in usersData) {
        // 2. Match file names to extract userId and match to firestore documents at /minawan/{userId}
        const userDoc = await db.collection('minawan').doc(userId).get();
        const twitchUsername = userDoc.exists ? userDoc.data()?.twitchUsername : undefined;

        const userFiles = usersData[userId].files;
        const entry: any = {
            twitchUsername
        };

        const getPublicUrl = (file: any) => {
            const metadata = file.metadata;
            const token = metadata?.metadata?.firebaseStorageDownloadTokens;
            // Standard public URL for Firebase Storage (GCS) with token
            return `https://firebasestorage.googleapis.com/v0/b/${event.bucket}/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`;
        };

        // 3. Generate a json list of {twitchUsername, minasona, minasona_(format)_256, minasona_(format)_512, minasona_(format)_64}
        // where the minasona fields are the match publicly accessible URL for the respective image
        
        // Expected files:
        // minasona.png, minasona_256x256.avif, minasona_256x256.png, minasona_512x512.avif, minasona_512x512.png, minasona_64x64.avif, minasona_64x64.png

        for (const file of userFiles) {
            // Check if file has a download token, if not, create one
            let metadata = file.metadata;
            if (!metadata?.metadata?.firebaseStorageDownloadTokens) {
                const token = crypto.randomUUID();
                await file.setMetadata({
                    metadata: {
                        firebaseStorageDownloadTokens: token
                    }
                });
                // Refresh metadata after update
                const [newMetadata] = await file.getMetadata();
                file.metadata = newMetadata;
            }

            const name = file.name.split('/').pop();
            const publicUrl = getPublicUrl(file);

            if (name === 'minasona.png') {
                entry.minasona = publicUrl;
            } else if (name === 'minasona_256x256.avif') {
                entry.minasona_avif_256 = publicUrl;
            } else if (name === 'minasona_256x256.png') {
                entry.minasona_png_256 = publicUrl;
            } else if (name === 'minasona_512x512.avif') {
                entry.minasona_avif_512 = publicUrl;
            } else if (name === 'minasona_512x512.png') {
                entry.minasona_png_512 = publicUrl;
            } else if (name === 'minasona_64x64.avif') {
                entry.minasona_avif_64 = publicUrl;
            } else if (name === 'minasona_64x64.png') {
                entry.minasona_png_64 = publicUrl;
            }
        }

        catalog.push(entry);
    }

    // 4. Upload the json file to the bucket at /minawan/gallery.json
    const galleryFile = bucket.file('minawan/gallery.json');
    await galleryFile.save(JSON.stringify(catalog), {
        contentType: 'application/json',
    });
});
