import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

export const discordBackdoorTwitch = onCall(async (request) => {
  const uid = request.auth?.uid;
  const token = request.data.token;

  if (!uid) {
    return {
      success: false,
      message: "User is not authenticated"
    }
  }

  if (!token) {
    return {
      success: false,
      message: "Missing discord token"
    }
  }

  const db = getFirestore();

  try {
    const response = await fetch('https://discord.com/api/users/@me/connections', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const connections: { type: string, name: string }[] = await response.json();
    const twitch = connections.find((connection) => connection.type === 'twitch');
    if (!twitch) return;

    const userDoc = db.collection('minawan').doc(uid);
    await userDoc.set({ twitchUsername: twitch.name }, { merge: true });
    return {
      success: true,
      message: "Twitch username synced: " + twitch.name
    }
  } catch (e: any) {
    console.error("Failed to sync Twitch username from Discord", e);
    return {
      success: false,
      message: "Failed to sync Twitch username from Discord"
    }
  }
});
