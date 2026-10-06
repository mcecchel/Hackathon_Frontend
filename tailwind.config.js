/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
	extend: {
	  colors: {
		pnx: {
		  purple: { DEFAULT: '#A92FB4', light: '#fdf4ff', hover: '#8c2496' },
		  blue: { DEFAULT: '#1F419B', dark: '#152c6b', hover: '#1a3682' }
		},
		status: { success: '#10b981', error: '#ef4444', warning: '#f59e0b' },
		bbox: { blur: '#f43f5e', dark: '#0ea5e9', finger: '#eab308' }
	  },
	  fontFamily: {
		sans: ['Inter', 'system-ui', 'sans-serif'],
		mono: ['Fira Code', 'ui-monospace', 'monospace'],
	  }
	},
  },
  plugins: [],
}