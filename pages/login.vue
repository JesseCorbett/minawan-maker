<script setup lang="ts">
import { OAuthProvider, signInWithPopup } from "firebase/auth";
import { definePageMeta } from "#imports";

definePageMeta({
  middleware: 'no-auth'
})

const auth = useFirebaseAuth()!
const router = useRouter()

const error = ref<string>()

async function loginDiscord() {
  const provider = new OAuthProvider('oidc.discord');
  provider.addScope("connections")

  try {
    const result = await signInWithPopup(auth, provider)
    const credential = OAuthProvider.credentialFromResult(result)
    console.log(result)
    console.log(credential)

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
    const result = await signInWithPopup(auth, provider)
    const credential = OAuthProvider.credentialFromResult(result)
    console.log(result)
    console.log(credential)

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
    <h1>Login with Discord</h1>
    <button @click="loginDiscord">Login</button>
    <p v-if="error">{{ error }}</p>
  </div>
</template>

<style scoped>

</style>
