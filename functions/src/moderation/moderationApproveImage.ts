import { onRequest } from 'firebase-functions/v2/https';
import { Community } from "../communities";
import { getFirestore } from "firebase-admin/firestore";
import { rebuildGallery } from "../updateJsonCatalog";
import { updateWebhookMessageToApproved } from "./webhookUtils";
import { firestore } from "firebase-admin";

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

  const user = await db.collection('minawan').doc(userId as string).get();
  const twitchUsername: string = user.exists ? user.data()?.twitchUsername : `🔴 Unlinked user (${userId})`;

  const approvalsDoc = db.collection('approvals').doc(community as Community);
  await approvalsDoc.set({
    approvedUsers: firestore.FieldValue.arrayUnion(userId)
  }, { merge: true });

  await rebuildGallery("minawan-pics.firebasestorage.app", community as Community);

  const previous = await db.collection('minawan').doc(userId as string).collection(`${community}-webhooks`).get();
  for (let doc of previous.docs) {
    const data = doc.data();
    const previousWebhook = data.webhook;
    const previousWebhookId = data.messageId;
    if (previousWebhook && previousWebhookId) {
      try {
        await updateWebhookMessageToApproved(previousWebhook, previousWebhookId, community as Community, data.image, twitchUsername, userId as string, key as string)
      } catch (e) {
        console.error('Failed to update webhook message', e)
      }
    }
  }

  res.status(200).send({ message: `Approved files for ${userId} in ${community}` });
});
