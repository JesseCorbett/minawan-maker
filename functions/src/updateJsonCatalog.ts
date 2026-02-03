import { onObjectFinalized } from 'firebase-functions/storage';
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { backfill } from './backfill';
import { Community, communityChannels } from './communities';
import { onRequest } from "firebase-functions/https";
import { defineString } from "firebase-functions/params";

const twitchClientSecret = defineString("TWITCH_CLIENT_SECRET");
const twitchClientId = "r0fi0v10fam8idvm6dmb0uv69bmfck";

function getPublicUrl(bucket: string, fileName: string) {
  return `https://storage.googleapis.com/${bucket}/${fileName}`;
}

export const updateJsonCatalog = onObjectFinalized({bucket: "minawan-pics.firebasestorage.app"}, async (event) => {
  const pathParts = event.data.name.split('/');
  if (pathParts.length !== 3) return;

  const community = pathParts[0] as Community;
  const userId = pathParts[1];
  const fileName = pathParts[2];

  if (fileName !== 'minasona.png') return;
  if (!Object.values(Community).includes(community)) return;

  const db = getFirestore();
  const update: { [key: string]: boolean } = {};
  update[community] = false;
  await db.collection('minawan').doc(userId).update(update);

  await rebuildGallery(event.bucket, community);
});

export async function rebuildGallery(bucketName: string, community: Community) {
  const storage = getStorage();
  const db = getFirestore();
  const auth = getAuth();
  const bucket = storage.bucket(bucketName);

  const approvalsDoc = await db.collection('approvals').doc(community).get();
  const approvals: string[] = approvalsDoc.exists ? (approvalsDoc.data()?.approvedUsers || []) : [];

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
    const userData = userDoc.exists ? userDoc.data() : undefined;

    async function fetchTwitchUserInfo(accessToken: string, refreshToken: string): Promise<{ id: string, username: string } | undefined> {
      let currentAccessToken = accessToken;
      let response = await fetch("https://id.twitch.tv/oauth2/userinfo", {
        headers: {
          Authorization: `Bearer ${currentAccessToken}`
        },
      });

      if (response.status === 401) {
        const refreshResponse = await fetch("https://id.twitch.tv/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: twitchClientId,
            client_secret: twitchClientSecret.value(),
          }),
        });

        if (!refreshResponse.ok) return undefined;

        const tokens = await refreshResponse.json() as any;
        currentAccessToken = tokens.access_token;

        await db.collection('minawan').doc(userId).update({
          twitchAccessToken: tokens.access_token,
          twitchRefreshToken: tokens.refresh_token,
        });

        response = await fetch("https://id.twitch.tv/oauth2/userinfo", {
          headers: {
            Authorization: `Bearer ${currentAccessToken}`
          },
        });
      }

      if (!response.ok) return undefined;

      const data = await response.json() as any;
      return { id: data.sub, username: data.preferred_username };
    }

    const twitchAccessToken = userData?.twitchAccessToken;
    const twitchRefreshToken = userData?.twitchRefreshToken;

    let twitchUsername = userData?.twitchUsername;
    let twitchId = userData?.twitchId;

    if (twitchAccessToken && twitchRefreshToken) {
      const userInfo = await fetchTwitchUserInfo(twitchAccessToken, twitchRefreshToken);
      if (userInfo) {
        twitchUsername = userInfo.username;
        twitchId = userInfo.id;
      }
    }

    const authUser = await auth.getUser(userId);
    const discordId = authUser.providerData[0]?.uid;

    // Ensure minasona.png is public (assuming others are too as they are created together)
    const [isPublic] = await file.isPublic();
    if (!isPublic) {
      await file.makePublic();
      await file.setMetadata({cacheControl: 'Cache-Control:public, max-age=600, s-maxage=600'});
    }

    // 3. Generate a JSON list of the community sona
    // where the object fields are the publicly accessible URL for the respective image
    const entry: any = {
      id: userId,
      twitchUsername,
      twitchId,
      discordId,
      approved: approvals.includes(userId) || false,
      original: getPublicUrl(bucketName, file.name),
      avif256: getPublicUrl(bucketName, `${community}/${userId}/minasona_256x256.avif`),
      png256: getPublicUrl(bucketName, `${community}/${userId}/minasona_256x256.png`),
      avif512: getPublicUrl(bucketName, `${community}/${userId}/minasona_512x512.avif`),
      png512: getPublicUrl(bucketName, `${community}/${userId}/minasona_512x512.png`),
      avif64: getPublicUrl(bucketName, `${community}/${userId}/minasona_64x64.avif`),
      png64: getPublicUrl(bucketName, `${community}/${userId}/minasona_64x64.png`)
    };

    catalog.push(entry);
  }

  if (community === Community.MINAWAN) {
    for (const backfillEntry of backfill) {
      if (!catalog.some((entry) => entry.twitchUsername === backfillEntry.twitchUsername)) {
        catalog.push({
          backfill: true,
          approved: true,
          twitchUsername: backfillEntry.twitchUsername,
          original: getPublicUrl(bucketName, `minawan-backfill/${backfillEntry.minasonaName}.webp`),
          avif256: getPublicUrl(bucketName, `minawan-backfill/${backfillEntry.minasonaName}_256x256.avif`),
          png256: getPublicUrl(bucketName, `minawan-backfill/${backfillEntry.minasonaName}_256x256.png`),
          avif512: getPublicUrl(bucketName, `minawan-backfill/${backfillEntry.minasonaName}_512x512.avif`),
          png512: getPublicUrl(bucketName, `minawan-backfill/${backfillEntry.minasonaName}_512x512.png`),
          avif64: getPublicUrl(bucketName, `minawan-backfill/${backfillEntry.minasonaName}_64x64.avif`),
          png64: getPublicUrl(bucketName, `minawan-backfill/${backfillEntry.minasonaName}_64x64.png`)
        });
      }
    }
  } else if (community === Community.WORMPAL) {
    const wormpalBackfill = [
      { twitchUsername: 'gomi', minasonaName: 'wormigomi' },
      { twitchUsername: 'unbreakabledoof', minasonaName: 'unbreakabledoof' },
      { twitchUsername: 'alexvoid', minasonaName: 'alex_void' },
    ];
    for (const backfillEntry of wormpalBackfill) {
      if (!catalog.some((entry) => entry.twitchUsername === backfillEntry.twitchUsername)) {
        catalog.push({
          backfill: true,
          approved: true,
          twitchUsername: backfillEntry.twitchUsername,
          original: getPublicUrl(bucketName, `wormpal-backfill/${backfillEntry.minasonaName}.webp`),
          avif256: getPublicUrl(bucketName, `wormpal-backfill/${backfillEntry.minasonaName}_256x256.avif`),
          png256: getPublicUrl(bucketName, `wormpal-backfill/${backfillEntry.minasonaName}_256x256.png`),
          avif512: getPublicUrl(bucketName, `wormpal-backfill/${backfillEntry.minasonaName}_512x512.avif`),
          png512: getPublicUrl(bucketName, `wormpal-backfill/${backfillEntry.minasonaName}_512x512.png`),
          avif64: getPublicUrl(bucketName, `wormpal-backfill/${backfillEntry.minasonaName}_64x64.avif`),
          png64: getPublicUrl(bucketName, `wormpal-backfill/${backfillEntry.minasonaName}_64x64.png`)
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
}

export const rebuildCatalog = onRequest(async (req, res) => {
  const { community } = req.query;

  if (!Object.values(Community).includes(community as Community)) {
    res.status(400).send("Invalid community");
    return;
  }

  try {
    await rebuildGallery("minawan-pics.firebasestorage.app", community as Community);
    res.status(200).send({ message: `Rebuilt catalog for ${community}` });
  } catch (error) {
    console.error("Error rebuilding catalog:", error);
    res.status(500).send("Internal Server Error");
  }
});
