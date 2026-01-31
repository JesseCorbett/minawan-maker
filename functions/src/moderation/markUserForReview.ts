import { onObjectFinalized } from 'firebase-functions/storage';
import { defineString, type StringParam } from "firebase-functions/params";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { Community } from "../communities";
import { sendReviewWebhook, deleteWebhookMessage } from "./webhookUtils";
import { firestore } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

const hoopyWebhook = defineString('HOOPY_WEBHOOK');

const communityWebhooks: { [key in Community]: StringParam } = {
  minawan: defineString('MINAWAN_WEBHOOK'),
  goomer: defineString('GOOMER_WEBHOOK'),
  minyan: defineString('MINYAN_WEBHOOK'),
  wormpal: defineString('WORMPAL_WEBHOOK')
};

async function createWebhookDoc(db: Firestore, userId: string, community: Community, webhook: string, image: string) {
  const doc = db.collection('minawan').doc(userId).collection(`${community}-webhooks`).doc();
  await doc.create({ webhook, image });
  return doc;
}

export const markUserForReview = onObjectFinalized({bucket: "minawan-pics.firebasestorage.app"}, async (event) => {
  const pathParts = event.data.name.split('/');
  if (pathParts.length !== 3) return;

  const community = pathParts[0] as Community;
  const fileName = pathParts[2];
  const userId = pathParts[1];

  if (fileName !== 'minasona_256x256.png') return;
  if (!Object.values(Community).includes(community)) return;

  const auth = getAuth();
  const db = getFirestore();
  const userDoc = await db.collection('minawan').doc(userId).get();
  const twitchUsername: string = userDoc.exists ? userDoc.data()?.twitchUsername : `🔴 Unlinked`;
  const discordId = (await auth.getUser(userId as string)).providerData[0]?.uid;

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

  const approvalsDoc = db.collection('approvals').doc(community);
  await approvalsDoc.set({
    approvedUsers: firestore.FieldValue.arrayRemove(userId)
  }, { merge: true });

  const hoopyWebhookDoc = await createWebhookDoc(db, userId, community, hoopyWebhook.value(), event.data.name);
  const hoopyWebhookId = await sendReviewWebhook(hoopyWebhook.value(), community, event.data.name, discordId, twitchUsername, userId, hoopyWebhookDoc.id);
  await hoopyWebhookDoc.update({ messageId: hoopyWebhookId });

  const communityWebhook = communityWebhooks[community].value();
  if (communityWebhook && communityWebhook !== hoopyWebhook.value()) {
    const modWebhookDoc = await createWebhookDoc(db, userId, community, communityWebhook, event.data.name);
    const modWebhookId = await sendReviewWebhook(communityWebhook, community, event.data.name, discordId, twitchUsername, userId, modWebhookDoc.id);
    await modWebhookDoc.update({ messageId: modWebhookId });
  }
});
