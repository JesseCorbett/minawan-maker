import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";

const twitchClientSecret = defineString("TWITCH_CLIENT_SECRET");
const twitchClientId = "r0fi0v10fam8idvm6dmb0uv69bmfck";
const twitchRedirectUri = "https://us-central1-minawan-pics.cloudfunctions.net/authenticateTwitch";

export const authenticateTwitch = onRequest(async (req, res) => {
  const code = req.query.code as string;
  const uid = req.query.state as string;
  const error = req.query.error;

  if (error) {
    logger.error("Twitch auth error", error);
    res.status(400).send(`Authentication failed: ${error}`);
    return;
  }

  if (!code) {
    res.status(400).send("Missing code parameter");
    return;
  }

  if (!uid) {
    res.status(400).send("Missing state parameter");
  }

  try {
    const params = new URLSearchParams();
    params.append("client_id", twitchClientId);
    params.append("client_secret", twitchClientSecret.value());
    params.append("code", code);
    params.append("grant_type", "authorization_code");
    params.append("redirect_uri", twitchRedirectUri);

    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).send(errorText);
      return;
    }

    const data = await response.json() as TwitchTokenResponse;
    
    await storeCredentials(data.access_token, data.refresh_token, uid);

    res.send("Successfully authenticated with Twitch! You can close this window.");
  } catch (e) {
    logger.error("Failed to authenticate", e);
    res.status(500).send("Internal Server Error");
  }
});

interface TwitchTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string[];
  token_type: string;
}

async function storeCredentials(accessToken: string, refreshToken: string, uid: string) {
  const db = getFirestore();
  const userDoc = db.collection('minawan').doc(uid);
  await userDoc.set({
    twitchAccessToken: accessToken,
    twitchRefreshToken: refreshToken
  }, { merge: true });
}
