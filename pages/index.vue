<script setup lang="ts">
const showContact = ref(false);
</script>

<template>
  <div>
    <h1>Make a Minawan!!</h1>
    <MinawanMaker body-light="#b8a099" body-shaded="#a18981" outline="#000000" mouth="#000000" eye-color="#000000" eyes="o"/>
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
        information on <a href="https://jessecorbett.com/">my homepage</a>.
      </p>
      <p>Be sure to tell me which community you come from and your project needs.</p>
      <h4>Credits</h4>
      <p>Canvas uses a modified version of the vector daavko made of Cerber's design</p>
      <p>Accessories provided by Diamondwan</p>
    </div>
  </div>
</template>

<style scoped>
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
