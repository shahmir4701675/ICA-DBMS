/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Custom ICA brand palette
        ica: {
          accent:  '#38BDF8', // sky-400
          green:   '#34D399', // emerald-400
          orange:  '#FB923C', // orange-400
          red:     '#F87171', // red-400
          purple:  '#A78BFA', // violet-400
        },
      },
    },
  },
  plugins: [],
}
