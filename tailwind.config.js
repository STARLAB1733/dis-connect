import defaultTheme from 'tailwindcss/defaultTheme';

export const content = [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
];
export const theme = { 
    extend: {
        fontFamily: {
            sans: ['var(--font-geist-sans)', ...defaultTheme.fontFamily.sans],
            noto: ['var(--font-noto)', ...defaultTheme.fontFamily.sans],
        },
    } 
};
export const plugins = [];
