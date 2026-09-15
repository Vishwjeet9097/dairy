/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        surface: 'var(--surface)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        brand: 'var(--brand)',
        'brand-dark': 'var(--brand-dark)',
        'brand-soft': 'var(--brand-soft)',
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        warning: 'var(--warning)',
        'warning-soft': 'var(--warning-soft)',
        info: 'var(--info)',
        'info-soft': 'var(--info-soft)',
        border: 'var(--border)',
        'border-subtle': 'rgba(0, 0, 0, 0.04)',
        'border-card': 'rgba(0, 0, 0, 0.05)',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'card': '0 2px 14px 0 rgba(0, 0, 0, 0.03)',
        'elevated': '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
        'floating': '0 8px 24px -4px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        '2.5xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
      },
    },
  },
  plugins: [],
}
