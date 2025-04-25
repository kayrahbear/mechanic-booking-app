/** @type {import('tailwindcss').Config} */
const config = {
    darkMode: 'class',
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './lib/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#0F4C81',
                'primary-dark': '#0a3a68',
                accent: '#FFA629',
                'accent-dark': '#e08c00',
                neutral: {
                    50: '#F9FAFB',
                    100: '#F4F6F8',
                    300: '#D1D5DB',
                    700: '#374151',
                },
                success: '#10B981',
                error: '#EF4444',
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui'],
            },
            boxShadow: {
                card: '0 1px 2px rgba(0,0,0,0.05)',
            },
        },
    },
    plugins: [],
};

export default config; 