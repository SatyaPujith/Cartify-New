/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cartify: {
          navy: '#131921',
          'navy-light': '#232f3e',
          'navy-hover': '#37475a',
          yellow: '#febd69',
          'yellow-hover': '#f3a847',
          orange: '#ff9900',
          'orange-hover': '#e88b00',
          link: '#007185',
          'link-hover': '#c7511f',
          price: '#b12704',
          background: '#eaeded',
          white: '#ffffff',
          'card-header': '#f3f3f3',
          success: '#067d62',
          'success-bg': '#e6f4e9',
          danger: '#b12704',
        },
      },
      fontFamily: {
        cartify: ['"Cartify Sans"', 'Arial', 'sans-serif'],
      },
      maxWidth: {
        'cartify': '1500px',
      },
    },
  },
  plugins: [],
};
