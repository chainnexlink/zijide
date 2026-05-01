module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './admin/src/**/*.{js,jsx,ts,tsx}',
    './index.html',
    './admin/index.html'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
      }
    }
  },
  plugins: []
};
