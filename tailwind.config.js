/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        'vercel-blue': '#0070F3',
        'vercel-pink': '#FF0080',
        'accents-1': '#FAFAFA',
        'accents-2': '#EAEAEA',
        'accents-3': '#999',
        'accents-4': '#888',
        'accents-5': '#666',
        'accents-6': '#444',
        'accents-7': '#333',
        'accents-8': '#111',
        'geist-foreground': '#000',
        'geist-secondary': '#666',
        'geist-background': '#fff',
        'dark-geist-foreground': '#fff',
        'dark-geist-secondary': '#888',
        'dark-geist-background': '#000',
        'dark-accents-1': '#111',
        'dark-accents-2': '#333',
        'mark-bg-light': '#FFF3A3',
        'mark-text-light': '#573A00',
        'mark-bg-dark': '#6B5800',
        'mark-text-dark': '#FFF3A3',
      },
      boxShadow: {
        'vercel-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'vercel-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'vercel-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
};
