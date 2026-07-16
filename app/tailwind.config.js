/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        doe: {
          red: '#C8102E',
          'red-dark': '#A00D24',
          'red-soft': '#FCEAEC',
        },
        charcoal: { 900: '#3D3D3D', 800: '#2C2C2C' },
        ink: { 950: '#2E2A22' },
        sand: { 700: '#8A7050', 500: '#A89070', 300: '#C4A87C', 100: '#EFE6D6' },
        action: {
          orange: '#E89B4C',
          'orange-dark': '#D08338',
          'orange-soft': '#FDF1E2',
          'orange-deep': '#B86E25',
        },
        success: { 500: '#22A745', soft: '#D4F4DD', dot: '#22C55E' },
        warning: { 500: '#D97706', soft: '#FEF3CD' },
        info: { 500: '#0E76A8', soft: '#E8F0F7' },
        danger: { 500: '#DC2626', soft: '#FEE2E2' },
        cream: '#FCF4E2',
        peach: '#FAE5C8',
        lavender: '#F4ECFA',
        butter: '#FFF8E0',
        mint: '#E8F5E9',
        neutral: {
          0: '#FFFFFF',
          25: '#FAFAF7',
          50: '#F5F5F2',
          100: '#EDEDE8',
          200: '#D9D9D2',
          300: '#B8B8B0',
          400: '#93938B',
          500: '#6B7280',
          700: '#4A5568',
          900: '#1F2937',
        },
        // "Inspector OS" palette — pure-white app surface, near-black ink,
        // vibrant accent colours. Replaces the cream/sand TAMM palette but
        // keeps the `tamm-*` token names so existing screen markup picks up
        // the new system without further rewrites.
        tamm: {
          bg:        '#F6F7F9',   // page background — cool near-white
          surface:   '#FFFFFF',   // card surface
          ink:       '#0B0E12',   // primary text (near-black, slight warmth)
          subtle:    '#6B7280',   // secondary text (cool gray)
          line:      '#EAEBEE',   // dividers + hairlines (cool gray)
          field:     '#F1F3F6',   // input / chip background
          tint:      '#E89B4C',   // accent orange (UAE accent)
          tintSoft:  '#FEF3E5',
          brand:     '#C8102E',   // DoE red (primary action)
          brandSoft: '#FEEBED',
          green:     '#059669',   // status green (vibrant)
          greenSoft: '#D1FAE5',
          amber:     '#D97706',   // status amber (warm, readable)
          amberSoft: '#FEF3CD',
          danger:    '#DC2626',
          dangerSoft:'#FEE2E2',
          info:      '#2563EB',   // info blue
          infoSoft:  '#DBEAFE',
          gold:      '#D4A24B',   // UAE-Pass / verified accent
        },
      },
      fontFamily: {
        // IBM Plex Sans + IBM Plex Sans Arabic — the TAMM-style government
        // typography pairing. Both English and Arabic ship from one type
        // family so the look is consistent across locales.
        sans: [
          '"IBM Plex Sans"', '"IBM Plex Sans Arabic"',
          'Inter', '"Noto Sans Arabic"',
          'system-ui', 'sans-serif',
        ],
        display: [
          '"IBM Plex Sans"', '"IBM Plex Sans Arabic"',
          '"Inter Tight"', 'Inter', 'sans-serif',
        ],
        mono: [
          '"IBM Plex Mono"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace',
        ],
      },
      boxShadow: {
        'doe-xs': '0 1px 2px rgba(31,41,55,0.04)',
        'doe-sm': '0 2px 4px rgba(31,41,55,0.06), 0 1px 2px rgba(31,41,55,0.04)',
        'doe-md': '0 8px 16px rgba(31,41,55,0.08), 0 2px 4px rgba(31,41,55,0.04)',
        'doe-lg': '0 16px 32px rgba(31,41,55,0.10), 0 4px 8px rgba(31,41,55,0.06)',
        'doe-xl': '0 24px 48px rgba(31,41,55,0.14), 0 8px 16px rgba(31,41,55,0.08)',
      },
      borderRadius: { xl: '12px', '2xl': '16px' },
    },
  },
  plugins: [],
};
