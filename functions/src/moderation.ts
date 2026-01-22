import { onObjectFinalized } from 'firebase-functions/storage';
import { onRequest } from 'firebase-functions/v2/https';
import { defineString, type StringParam } from "firebase-functions/params";
import { Community } from "./communities";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { rebuildGallery } from "./updateJsonCatalog";

function getPublicUrl(bucket: string, fileName: string) {
  return `https://storage.googleapis.com/${bucket}/${fileName}`;
}

const moderationKey = defineString('MODERATION_KEY');
const hoopyWebhook = defineString('HOOPY_WEBHOOK');

const communityWebhooks: { [key in Community]: StringParam } = {
  minawan: defineString('MINAWAN_WEBHOOK'),
  goomer: defineString('GOOMER_WEBHOOK'),
  minyan: defineString('MINYAN_WEBHOOK'),
  wormpal: defineString('WORMPAL_WEBHOOK')
};

async function sendReviewWebhook(url: string, bucket: string, community: Community, filename: string, user: string, userId: string) {
  await fetch(`${url}?wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      "content": null,
      "embeds": [
        {
          "title": "Delete this image",
          "url": `https://moderationdeleteimage-yicsegqncq-uc.a.run.app?key=${moderationKey.value()}&community=${community}&userId=${userId}`,
          "color": null,
          "footer": {
            "text": user
          },
          "timestamp": null,
          "image": {
            "url": getPublicUrl(bucket, filename) + '?t=' + Date.now()
          }
        }
      ],
      "attachments": []
    })
  });
  console.warn('Webhook submitted');
}

export const submitModerationWebhook = onObjectFinalized({bucket: "minawan-pics.firebasestorage.app"}, async (event) => {
  const pathParts = event.data.name.split('/');
  if (pathParts.length !== 3) return;

  const community = pathParts[0] as Community;
  const fileName = pathParts[2];
  const userId = pathParts[1];

  if (fileName !== 'minasona_256x256.png') return;
  if (!Object.values(Community).includes(community)) return;

  const db = getFirestore();
  const userDoc = await db.collection('minawan').doc(userId).get();
  const twitchUsername: string = userDoc.exists ? userDoc.data()?.twitchUsername : `Unknown user (${userId})`;

  const communityWebhook = communityWebhooks[community].value();

  if (communityWebhook && communityWebhook !== hoopyWebhook.value()) {
    await sendReviewWebhook(communityWebhook, event.bucket, community, event.data.name, twitchUsername, userId);
  }
  await sendReviewWebhook(hoopyWebhook.value(), event.bucket, community, event.data.name, twitchUsername, userId);
});


export const moderationDeleteImage = onRequest(async (req, res) => {
  const { community, userId, key } = req.query;

  if (key !== moderationKey.value()) {
    res.status(401).send("Invalid moderation key");
    return;
  }

  if (!community || !userId) {
    res.status(400).send("Missing community or userId");
    return;
  }

  if (!Object.values(Community).includes(community as Community)) {
    res.status(400).send("Invalid community");
    return;
  }

  const bucket = getStorage().bucket("minawan-pics.firebasestorage.app");
  try {
    await bucket.deleteFiles({ prefix: `${community}/${userId}/` });
    await rebuildGallery("minawan-pics.firebasestorage.app", community as Community);
    res.status(200).send({ message: `Deleted files for ${userId} in ${community}` });
  } catch (error) {
    console.error("Error deleting files:", error);
    res.status(500).send("Internal Server Error");
  }
});
