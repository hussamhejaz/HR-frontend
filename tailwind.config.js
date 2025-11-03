/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Sans text everywhere (SF on Apple)
        sans: [
          "-apple-system", "BlinkMacSystemFont", // SF on macOS/iOS
          "ui-sans-serif", "system-ui",
          "Segoe UI", "Roboto", "Helvetica Neue", "Arial",
          "Noto Sans", "Liberation Sans",
          "sans-serif",
          "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji",
        ],
        // Optional: monospace stack with SF Mono on Apple
        mono: [
          "ui-monospace", "SFMono-Regular", "Menlo", "Monaco",
          "Consolas", "Liberation Mono", "Courier New", "monospace",
        ],
      },
    },
  },
  plugins: [],
};
