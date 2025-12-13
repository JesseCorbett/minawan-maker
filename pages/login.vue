<script setup lang="ts">
import { OAuthProvider, signInWithRedirect, signInWithPopup, getRedirectResult } from "firebase/auth";
import { definePageMeta } from "#imports";

definePageMeta({
  middleware: 'no-auth'
})

const auth = useFirebaseAuth()!
const router = useRouter()

const error = ref<string>()

function login() {
  const provider = new OAuthProvider('oidc.discord');
  provider.addScope("identify")
  provider.addScope("openid")
  provider.addScope("connections")


  signInWithRedirect(auth, provider)
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
