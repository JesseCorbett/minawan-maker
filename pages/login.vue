<script setup lang="ts">
import { OAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

definePageMeta({
  middleware: 'no-auth',
  layout: 'purple'
})

const auth = useFirebaseAuth()!
const router = useRouter()

const user = useCurrentUser();

const db = useFirestore()

const error = ref<string>()

async function loginDiscord() {
  const provider = new OAuthProvider('oidc.discord');
  provider.addScope("connections")

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = OAuthProvider.credentialFromResult(result);

    setTimeout(async () => {
      if (credential && credential.accessToken && user.value && result.providerId === 'oidc.discord') {
        await syncTwitchUsername(credential.accessToken, user.value.uid);
      }

      await router.replace('/');
    }, 500);
  } catch (e) {
    console.error(e);
  }
}

async function syncTwitchUsername(accessToken: string, userId: string) {
  try {
    const response = await fetch('https://discord.com/api/users/@me/connections', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const connections: { type: string, name: string }[] = await response.json();
    const twitch = connections.find((connection) => connection.type === 'twitch');
    if (!twitch) return;

    await setDoc(doc(db, 'minawan', userId), {
      twitchUsername: twitch.name
    }, { merge: true });
  } catch (e) {
    console.error('Failed to sync Twitch username from Discord', e);
  }
}

async function loginTwitch() {
  const provider = new OAuthProvider('oidc.twitch');
  provider.addScope("openid")
  provider.addScope("user:read:email")
  provider.setCustomParameters({
    claims: JSON.stringify({
      "id_token": {
        "email": null,
        "preferred_username": null
      }
    })
  })

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = OAuthProvider.credentialFromResult(result);

    if (credential && result.providerId === 'oidc.discord') {
      const response = await fetch('https://discord.com/api/users/@me/connections', {
        headers: {
          Authorization: `Bearer ${credential.accessToken}`,
        },
      });

      const connections: any[] = await response.json()
      const twitch = connections.find((connection) => connection.type === 'twitch')
      if (twitch) {
        alert(`Hey there Twitch user ${twitch.name}!`)
      }
    }
  } catch (e) {
    console.error(e)
  }
}
</script>

<template>
  <div>
    <Title>Login</Title>
    <h1>Login</h1>
    <p>
      Logging in allows you to upload your creations to the Minawan Gallery and update your details for the Minawan community API,
      which is used by projects like the Minasona Twitch extension.
      <br/>
      <br/>
      We only access your public Discord info to log you in and also automatically synchronize your Twitch username if you have linked it with your Discord account.
    </p>
    <button @click="loginDiscord">
      <img src="~/assets/discord.svg" alt="Discord logo" width="28" height="28"/>
      <span>Continue with Discord</span>
    </button>
    <p v-if="error">{{ error }}</p>
  </div>
</template>

<style scoped>
button {
  cursor: pointer;
  background-color: #5865F2;
  border-radius: 4px;
  color: white;
  font-weight: 700;
  font-size: 22px;
  padding: 12px 42px;
  border: 2px solid #444ebc;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  user-select: none;
  margin: 64px auto 0;
}

p {
  margin: 16px 0;
  font-size: 16px;
  font-family: sans-serif;
  background: var(--yellow);
  border-radius: 16px;
  border: 4px solid var(--pink);
  max-width: 600px;
  padding: 16px;
}
</style>
