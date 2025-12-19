<script setup lang="ts">
import { ref as storageRef } from 'firebase/storage'
const storage = useFirebaseStorage();
const auth = useFirebaseAuth()!
const user = useCurrentUser();

async function logout() {
  await auth.signOut();
}

const showContact = ref(false);

const uploadPath = computed(() => {
  if (user.value) {
    return `minawan/${user.value!.uid}/minasona.png`;
  }
});

const uploadRef = computed(() => {
  if (uploadPath.value) {
    return storageRef(storage, uploadPath.value);
  }
});

const { upload, uploadProgress } = useStorageFile(uploadRef);

async function uploadMinasona(base64: string) {
  const response = await fetch(base64);
  const blob = await response.blob();
  upload(blob);
}

async function checkFileInput(event: InputEvent) {
  const fileInput = event.target as HTMLInputElement;
  const file = fileInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target?.result as string;
    await uploadMinasona(base64);
  };
  reader.readAsDataURL(file);

}
</script>

<template>
  <div style="display: flex; flex-direction: column; align-items: center">
    <h1>Make a Minawan!!</h1>
    <div id="links">
      <NuxtLink id="to-gallery" to="/gallery">View Minawan Gallery</NuxtLink>
      <label v-if="!!user" for="upload-minawan-file">{{ uploadProgress ? `Uploaded ${Math.ceil(uploadProgress * 100)}%` : 'Upload Minasona' }}</label>
      <input
          id="upload-minawan-file"
          type="file"
          accept="image/*"
          style="display: none"
          @change="checkFileInput"/>
      <NuxtLink v-if="!user" to="/login">Login</NuxtLink>
      <div v-if="!!user" id="logout" @click="logout">Logout</div>
    </div>
    <MinawanMaker
        body-light="#b8a099"
        body-shaded="#a18981"
        outline="#000000"
        mouth="#000000"
        eye-color="#000000"
        eyes="o"/>
    <div id="credit">
      <div id="info" @mouseover="showContact = true">ⓘ</div>
    </div>
    <div id="contact-me" v-if="showContact">
      <div id="close" @click="showContact = false">✕</div>
      <h3>Who made this?</h3>
      <p>Hey, I'm hoopy, real name Jesse!</p>
      <p>I'm a professional software engineer and enjoy working on projects for communities and creators.</p>
      <h4>Volunteering</h4>
      <p>Community leader or creator and have a project idea? Reach out!</p>
      <p>
        When I'm on a project I work strictly in a
        professional and private manner. You're my client first and foremost.
      </p>
      <p>
        You can contact me at <span>hoopy.</span> on Discord and find my professional qualifications and contact
        information on <a href="https://jessecorbett.com/">my portfolio</a>.
      </p>
      <p>Be sure to tell me which community you come from and your project needs.</p>
      <h4>Credits</h4>
      <p>Canvas uses a modified version of the vector daavko made of Cerber's design</p>
      <p>Accessories provided by Diamondwan</p>
    </div>
  </div>
</template>

<style scoped>
#links {
  display: flex;
  gap: 8px;
}

#links > * {
  text-decoration: none;
  background-color: var(--cerb-dark);
  color: white;
  font-family: sans-serif;
  font-size: 16px;
  margin: -24px auto 16px;
  padding: 4px 6px;
  border: 4px solid var(--cerb-dark);
  border-radius: 12px;
  cursor: pointer;
}

#links > *:hover {
  background: var(--cerb-light);
}

#logout {
  background: white;
  color: var(--cerb-dark);
}

#logout:hover {
  background: white;
}

#credit {
  font-size: 10px;
  position: fixed;
  bottom: -1px;
  right: -1px;
  color: var(--cerb-dark);
  font-family: sans-serif;
  padding: 4px;
  background: var(--yellow);
  border-top-left-radius: 12px;
  border: 1px solid var(--cerb-light);
}

#credit #info {
  line-height: 32px;
  height: 28px;
  font-size: 28px;
  float: right;
  user-select: none;
  cursor: pointer;
  padding-left: 2px;
}

#contact-me {
  font-family: sans-serif;
  position: fixed;
  right: 64px;
  bottom: 96px;
  background: var(--yellow);
  padding: 16px;
  border-radius: 12px;
  border: 2px solid var(--cerb-light);
  max-width: 400px;
}

#contact-me #close {
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 16px;
  cursor: pointer;
  user-select: none;
}

#contact-me span {
  font-family: monospace;
  font-weight: 500;
  user-select: all;
  padding: 3px 5px;
  margin: -5px -2px;
  background: #7289da;
  color: white;
  border-radius: 4px;
}

#contact-me h3, #contact-me h4 {
  margin: 0;
}

#contact-me h4 {
  margin-top: 16px;
}

#contact-me p {
  margin: 0;
  padding: 4px 0;
}
</style>
