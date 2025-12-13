<script setup lang="ts">
import { OAuthProvider, signInWithRedirect, signInWithPopup, getRedirectResult } from "firebase/auth";
import { definePageMeta } from "#imports";
import { ca } from "cronstrue/dist/i18n/locales/ca";

definePageMeta({
  middleware: 'no-auth'
})

const auth = useFirebaseAuth()!
const router = useRouter()

const error = ref<string>()

async function login() {
  console.log(auth)
  const provider = new OAuthProvider('oidc.discord');
  provider.addScope("identify")
  provider.addScope("openid")
  provider.addScope("connections")


  // signInWithRedirect(auth, provider)
  try {
    const result = await signInWithPopup(auth, provider)
    console.log(result)
  } catch (e) {
    console.error(e)
  }
}

onMounted(async () => {
  try {
    const result = await getRedirectResult(auth)
    console.log(result)
    //await router.push("/")
  } catch (e) {
    error.value = 'There was an error signing in'
  }
})
</script>

<template>
  <div>
    <Title>Login</Title>
    <h1>Login with Discord</h1>
    <button @click="login">Login</button>
    <p v-if="error">{{ error }}</p>
  </div>
</template>

<style scoped>

</style>
