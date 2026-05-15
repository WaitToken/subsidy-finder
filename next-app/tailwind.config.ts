import type { Config } from 'tailwindcss';

// editorial 日本誌風: 和紙色の地・墨色の文字・朱色のアクセント
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f6f3ea', // 和紙色の地
        panel: '#fffdf7', // カード等の面
        ink: '#211e1a', // 墨色の本文
        subink: '#6b6459', // 補助テキスト
        line: '#ddd6c8', // 罫線
        accent: '#bc4b2f', // 朱色のアクセント
        'accent-soft': '#f0e0d8',
      },
      fontFamily: {
        serif: [
          '"Hiragino Mincho ProN"',
          '"Yu Mincho"',
          'YuMincho',
          '"Noto Serif JP"',
          'serif',
        ],
        sans: [
          '"Hiragino Sans"',
          '"Yu Gothic"',
          'YuGothic',
          '"Noto Sans JP"',
          'sans-serif',
        ],
      },
      maxWidth: {
        content: '64rem',
      },
    },
  },
  plugins: [],
};

export default config;
