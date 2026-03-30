/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./mobile/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}"
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                cream: {
                    DEFAULT: '#f5f5f5', // Main light background
                    'light': '#ffffff',
                },
                charcoal: {
                    DEFAULT: '#334155', // Main dark text
                    'light': '#64748b',
                    'dark': '#1e293b',
                    '900': '#0f172a', // Main dark background
                },
                emerald: {
                    DEFAULT: '#10b981',
                    'dark': '#059669',
                },
                terracotta: {
                    DEFAULT: '#e57373', // A soft red for danger/alerts
                    'dark': '#d32f2f',
                },
                coffee: {
                    dark: '#3d2b1f',
                    medium: '#6f4e37',
                    light: '#a67c52',
                },
            },
            fontFamily: {
                sans: ['"Nunito"', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
