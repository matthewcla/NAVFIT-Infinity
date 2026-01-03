/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      zIndex: {
        'infinity-modal': '100',
        'infinity-tooltip': '9999',
        'infinity-header': '50',
        'infinity-slideover': '100',
        'infinity-sidebar': '40',
        'infinity-fab': '50',
      },
      spacing: {
        'sidebar-standard': '420px',
        'member-sidebar': '480px',
        'header-height': '85px',
        'chart-header': '40px',
        'row-standard': '50px',
      },
      width: {
        'sidebar-standard': '420px',
        'member-sidebar': '480px',
      },
      minHeight: {
        'header-height': '85px',
      },
      colors: {
        // Ensuring these match the logic files
        'chart-periodic': '#3b82f6', // blue-500
        'chart-transfer': '#ef4444', // red-500
        'chart-gain': '#64748b',     // slate-500
        'chart-special': '#eab308',  // yellow-500
        'chart-promotion': '#22c55e', // green-500
      }
    },
  },
  plugins: [],
}
