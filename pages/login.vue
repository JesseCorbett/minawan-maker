<script setup lang="ts">
import { OAuthProvider, signInWithPopup } from "firebase/auth";
import { httpsCallable, getFunctions } from 'firebase/functions';

definePageMeta({
  middleware: 'no-auth',
  layout: 'purple'
})

const firebaseApp = useFirebaseApp();
const auth = useFirebaseAuth()!;
const backdoor = httpsCallable(getFunctions(firebaseApp), 'discordBackdoorTwitch');
const user = useCurrentUser();

const router = useRouter();

const error = ref<string>();

async function loginDiscord() {
  const provider = new OAuthProvider('oidc.discord');
  provider.addScope("connections");

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = OAuthProvider.credentialFromResult(result);

    setTimeout(async () => {
      if (credential && credential.accessToken && user.value && result.providerId === 'oidc.discord') {
        await syncTwitchUsername(credential.accessToken);
      }

      await router.replace('/');
    }, 500);
  } catch (e) {
    console.error(e);
  }
}

async function syncTwitchUsername(token: string) {
  try {
    const result = await backdoor({ token });
    console.log('Synced Twitch username from Discord', result.data);
  } catch (e) {
    console.error('Failed to sync Twitch username from Discord', e);
  }
}
</script>

<template>
  <div>
    <Title>Login</Title>
    <h1>Login</h1>
    <p>
      Logging in allows you to upload your minasona to the Minawan Gallery and update your details for the Minawan Community API,
      which is used by projects like the Minasona Twitch extension.
      <br/>
      <br/>
      We only access your Discord ID to log you in and if you have linked your Twitch account to Discord we will automatically import your Twitch username for the API. We do not have access to any other type of information.
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
