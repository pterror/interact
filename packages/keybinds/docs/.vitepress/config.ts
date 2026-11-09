import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'keybinds',
  description: 'Keybindings for the web, as small modules',
  base: '/keybinds/',

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Reference', link: '/reference/' },
    ],

    sidebar: {
      '/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/' },
            { text: 'Modules', link: '/guide/modules' },
            { text: 'Ready-made UI', link: '/guide/ui' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'API', link: '/reference/' },
            { text: 'Ready-made UI', link: '/reference/ui' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/pterror/interact' }],

    search: {
      provider: 'local',
    },
  },
})
