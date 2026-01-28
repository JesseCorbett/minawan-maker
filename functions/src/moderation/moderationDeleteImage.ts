import { onRequest } from "firebase-functions/https";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { Community } from "../communities";
import { deleteWebhookMessage } from "./webhookUtils";
import { rebuildGallery } from "../updateJsonCatalog";

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