import { onRequest } from "firebase-functions/https";
import { defineString } from "firebase-functions/params";
import { Community, communityChannels } from "../communities";
import { firestore } from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const adminKey = defineString('ADMIN_KEY');

const channelMap = Object.fromEntries(Object.entries(communityChannels).map(([key, value]) => [value, key]));

export const approveAll = onRequest(async (req, res) => {
  const { key } = req.query;
  if (key !== adminKey.value()) {
    res.status(401).send("Invalid admin key");
    return;
  }

  const db = getFirestore();

  const response = await fetch('https://storage.googleapis.com/minawan-pics.firebasestorage.app/api.json');
  const api: { [channel: string]: { approved: boolean; id: string }[] } = await response.json();

  const channels = Object.keys(api);
  const touchedCommunities = [];

  for (const channel of channels) {
    const community = channelMap[channel];
    const unapproved = api[channel].filter(entry => !entry.approved).map(entry => entry.id);
    if (unapproved.length === 0) continue;
    touchedCommunities.push(community as Community);
    await db.collection('approvals').doc(community).set({
      approvedUsers: firestore.FieldValue.arrayUnion(...unapproved)
    }, { merge: true });
  }

  res.status(200).send({ message: `Need to rebuild catalog for ${touchedCommunities}` });
});
