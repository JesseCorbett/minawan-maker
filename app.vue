<template>
  <NuxtLayout>
    <NuxtPage/>
  </NuxtLayout>
</template>

<style>
body {
  margin: 0;
  --cerb-dark: #9B4ED0;
  --cerb-light: #A455CD;
  --pink: #ec7fbb;
  --yellow: #FADFB7;
  --black: #322E43;
  --twitch-purple: #9146FF;
  background-color: var(--cerb-dark);
}

h1, h2 {
  text-align: center;
  font-family: DynaPuff;
  color: white;
  text-shadow: var(--pink) 2px 4px, var(--pink) -1px -1px;
  font-size: 78px;
  font-weight: 700;
  margin: 24px 0;
}
</style>
