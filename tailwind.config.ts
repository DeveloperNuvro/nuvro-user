import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // not strictly needed when overriding --font-sans manually
    },
  },
  plugins: [],
}

export default config
