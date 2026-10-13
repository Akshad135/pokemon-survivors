import { defineConfig } from 'vite'

// One page per language so each gets its own title, description and hreflang (see index.html and en/index.html).
export default defineConfig({
  build: {
    rolldownOptions: {
      input: { main: 'index.html', en: 'en/index.html' },
    },
  },
})
