import { onObjectFinalized } from 'firebase-functions/storage';
import { onRequest } from 'firebase-functions/v2/https';
import { defineString, type StringParam } from "firebase-functions/params";
import { Community } from "./communities";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { rebuildGallery } from "./updateJsonCatalog";

function getPublicUrl(bucket: string, fileName: string) {
  return `https://storage.googleapis.com/${bucket}/${fileName}`;
}

const hoopyWebhook = defineString('HOOPY_WEBHOOK');

const communityWebhooks: { [key in Community]: StringParam } = {
  minawan: defineString('MINAWAN_WEBHOOK'),
  goomer: defineString('GOOMER_WEBHOOK'),
  minyan: defineString('MINYAN_WEBHOOK'),
  wormpal: defineString('WORMPAL_WEBHOOK')
};

async function sendReviewWebhook(
  url: string,
  community: Community,
  filename: string,
  user: string,
  userId: string,
  moderationKey: string
) {
  const result = await fetch(`${url}?wait=true&with_components=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      "flags": 1 << 15, // Components V2
      "components": [
        {
          "type": 17,
          "components": [
            {
              "type": 10,
              "content": `User ${user} uploaded a ${community}`
            },
            {
              "type": 12,
              "items": [
                {
                  "media": { "url": getPublicUrl('minawan-pics.firebasestorage.app', filename) + '?t=' + Date.now() },
                }
              ]
            },
            {
              "type": 1,
              "components": [
                {
                  "type": 2,
                  "label": "Approve",
                  "emoji": {
                    "id": null,
                    "name": "✅"
                  },
                  "style": 5,
                  "url": `https://us-central1-minawan-pics.cloudfunctions.net/moderationApproveImage?key=${moderationKey}&community=${community}&userId=${userId}`
                },
                {
                  "type": 2,
                  "label": "Remove",
                  "emoji": {
                    "id": null,
                    "name": "🗑️"
                  },
                  "style": 5,
                  "url": `https://us-central1-minawan-pics.cloudfunctions.net/moderationDeleteImage?key=${moderationKey}&community=${community}&userId=${userId}`,
                }
              ]
            }
          ]
        }
      ]
    })
  });
  console.info('Webhook submitted');
  const message: { id: string } = await result.json()
  return message.id;
}

async function updateWebhookMessageToApproved(
  url: string,
  messageId: string,
  community: Community,
  filename: string,
  user: string,
  userId: string,
  moderationKey: string
) {
  const result = await fetch(`${url}/messages/${messageId}?wait=true&with_components=true`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      "flags": 1 << 15, // Components V2
      "components": [
        {
          "type": 17,
          "components": [
            {
              "type": 10,
              "content": `User ${user} uploaded a ${community}`
            },
            {
              "type": 12,
              "items": [
                {
                  "media": { "url": getPublicUrl('minawan-pics.firebasestorage.app', filename) + '?t=' + Date.now() },
                }
              ]
            },
            {
              "type": 1,
              "components": [
                {
                  "type": 2,
                  "label": "Already Approved",
                  "style": 5,
                  "url": `https://us-central1-minawan-pics.cloudfunctions.net/moderationApproveImage?key=${moderationKey}&community=${community}&userId=${userId}`,
                  "disabled": true
                },
                {
                  "type": 2,
                  "label": "Remove",
                  "emoji": {
                    "id": null,
                    "name": "🗑️"
                  },
                  "style": 5,
                  "url": `https://us-central1-minawan-pics.cloudfunctions.net/moderationDeleteImage?key=${moderationKey}&community=${community}&userId=${userId}`,
                }
              ]
            }
          ]
        }
      ]
    })
  });
  console.info('Webhook updated');
  const message: { id: string } = await result.json()
  return message.id;
}

async function deleteWebhookMessage(webhook: string, messageId: string) {
  try {
    await fetch(`${webhook}/messages/${messageId}`, {
      method: 'DELETE'
    });
  } catch (e) {
    console.error(`Failed to delete webhook for message ID ${messageId}`, e);
  }
}

async function createWebhookDoc(db: Firestore, userId: string, community: Community, webhook: string, image: string) {
  const doc = db.collection('minawan').doc(userId).collection(`${community}-webhooks`).doc();
  await doc.create({ webhook, image });
  return doc;
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

  const previous = await db.collection('minawan').doc(userId).collection(`${community}-webhooks`).get();
  for (let doc of previous.docs) {
    const data = doc.data();
    const previousWebhook = data.webhook;
    const previousWebhookId = data.messageId;
    if (previousWebhook && previousWebhookId) {
      await deleteWebhookMessage(previousWebhook, previousWebhookId);
    }
    await doc.ref.delete();
  }

  const hoopyWebhookDoc = await createWebhookDoc(db, userId, community, hoopyWebhook.value(), event.data.name);
  const hoopyWebhookId = await sendReviewWebhook(hoopyWebhook.value(), community, event.data.name, twitchUsername, userId, hoopyWebhookDoc.id);
  await hoopyWebhookDoc.update({ messageId: hoopyWebhookId });

  const communityWebhook = communityWebhooks[community].value();
  if (communityWebhook && communityWebhook !== hoopyWebhook.value()) {
    const modWebhookDoc = await createWebhookDoc(db, userId, community, communityWebhook, event.data.name);
    const modWebhookId = await sendReviewWebhook(communityWebhook, community, event.data.name, twitchUsername, userId, modWebhookDoc.id);
    await modWebhookDoc.update({ messageId: modWebhookId });
  }
});


export const moderationDeleteImage = onRequest(async (req, res) => {
  const { community, userId, key } = req.query;

  if (!key || !community || !userId) {
    res.status(400).send("Missing key, community, or userId");
    return;
  }

  if (!Object.values(Community).includes(community as Community)) {
    res.status(400).send("Invalid community");
    return;
  }

  const db = getFirestore();
  const webhookDocRef = db.collection('minawan').doc(userId as string).collection(`${community}-webhooks`).doc(key as string);
  const webhookDoc = await webhookDocRef.get();

  if (!webhookDoc.exists) {
    res.status(401).send("Invalid moderation key");
    return;
  }

  const bucket = getStorage().bucket("minawan-pics.firebasestorage.app");
  try {
    await bucket.deleteFiles({ prefix: `${community}/${userId}/` });
    await rebuildGallery("minawan-pics.firebasestorage.app", community as Community);
  } catch (error) {
    console.error("Error deleting files:", error);
    res.status(500).send("Internal Server Error");
    return;
  }

  const previous = await db.collection('minawan').doc(userId as string).collection(`${community}-webhooks`).get();
  for (let doc of previous.docs) {
    const data = doc.data();
    const previousWebhook = data.webhook;
    const previousWebhookId = data.messageId;
    if (previousWebhook && previousWebhookId) {
      await deleteWebhookMessage(previousWebhook, previousWebhookId);
    }
    await doc.ref.delete();
  }

  res.status(200).send({ message: `Deleted files for ${userId} in ${community}` });
});

export const moderationApproveImage = onRequest(async (req, res) => {
  const { community, userId, key } = req.query;

  if (!key || !community || !userId) {
    res.status(400).send("Missing key, community, or userId");
    return;
  }

  if (!Object.values(Community).includes(community as Community)) {
    res.status(400).send("Invalid community");
    return;
  }

  const db = getFirestore();
  const webhookDocRef = db.collection('minawan').doc(userId as string).collection(`${community}-webhooks`).doc(key as string);
  const webhookDoc = await webhookDocRef.get();

  if (!webhookDoc.exists) {
    res.status(401).send("Invalid moderation key");
    return;
  }

  const userDoc = db.collection('minawan').doc(userId as string);
  const user = await userDoc.get();
  const twitchUsername: string = user.exists ? user.data()?.twitchUsername : `Unknown user (${userId})`;
  const update: {  [key: string]: boolean } = {};
  update[community as string] = true
  await userDoc.update(update);

  await rebuildGallery("minawan-pics.firebasestorage.app", community as Community);

  const previous = await db.collection('minawan').doc(userId as string).collection(`${community}-webhooks`).get();
  for (let doc of previous.docs) {
    const data = doc.data();
    const previousWebhook = data.webhook;
    const previousWebhookId = data.messageId;
    if (previousWebhook && previousWebhookId) {
      await updateWebhookMessageToApproved(previousWebhook, previousWebhookId, community as Community, data.image, twitchUsername, userId as string, key as string)
    }
  }

  res.status(200).send({ message: `Approved files for ${userId} in ${community}` });
});
