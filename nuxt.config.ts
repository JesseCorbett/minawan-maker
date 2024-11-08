// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2024-04-03',
  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    }
  },

  modules: ['nuxt-vuefire', '@nuxtjs/google-fonts'],

  app: {
    head: {
      title: 'Make a Minawan!!',
      script: [{ src: '/jscolor.min.js' }],
      meta: [
        { property: 'og:title', content: 'Minawan.me' },
        { property: 'og:image', content: '/minawan.png' },
        { property: 'og:description', content: 'Make your own custom Minawan!' }
      ]
    }
  },

  googleFonts: {
    families: {
      DynaPuff: [400, 500, 600, 700]
    }
  },

  vuefire: {
    config: {
      apiKey: 'AIzaSyDxt3cucfKtCQDLj1fLOzsdljVbp2aTIzE',
      authDomain: 'minawan.me',
      projectId: 'minawan-pics',
      storageBucket: 'minawan-pics.firebasestorage.app',
      messagingSenderId: '882247576882',
      appId: '1:882247576882:web:ea150826af8e1e30083b2b',
      measurementId: 'G-PS3SX52974'
    },
    auth: {
      enabled: true
    }
  }
});