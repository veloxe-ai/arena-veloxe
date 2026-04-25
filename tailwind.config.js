/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // War-room palette — charcoal foundation, data-green accent, model colors
        bg: {
          0: '#0a0b0e',         // deepest black-charcoal
          1: '#101218',         // pane background
          2: '#161923',         // panel surface
          3: '#1e222e',         // elevated surface
        },
        fg: {
          0: '#e6e9ef',         // primary text
          1: '#a3a9b8',         // secondary text
          2: '#5f6676',         // tertiary / muted
          3: '#373c48',         // disabled / border
        },
        // Status / data
        ok: '#10b981',          // sage green — consensus, good, go
        warn: '#fbbf24',         // amber — partial, caution
        err: '#ef4444',         // red — dissent, bad, blocked
        accent: '#8b5cf6',       // violet — synthesis, output
        info: '#38bdf8',         // sky — metadata, secondary
        // Model family tints (subtle, not neon)
        gpt: '#10a37f',
        claude: '#cc785c',
        gemini: '#4285f4',
        grok: '#e8375a',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 8s linear infinite',
        'flicker': 'flicker 0.15s infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.92' },
        },
      },
      boxShadow: {
        'glow-ok': '0 0 20px -5px rgba(16, 185, 129, 0.4)',
        'glow-warn': '0 0 20px -5px rgba(251, 191, 36, 0.4)',
        'glow-err': '0 0 20px -5px rgba(239, 68, 68, 0.4)',
        'glow-accent': '0 0 24px -4px rgba(139, 92, 246, 0.5)',
        'pane': '0 1px 0 rgba(255,255,255,0.03) inset, 0 0 0 1px rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [],
}
