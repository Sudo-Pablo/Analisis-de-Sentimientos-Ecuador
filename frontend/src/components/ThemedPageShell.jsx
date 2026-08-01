const THEME_STYLES = {
  facebook: {
    background: `
      radial-gradient(ellipse 85% 50% at 10% 0%, rgba(24, 119, 242, 0.22), transparent 55%),
      radial-gradient(ellipse 70% 45% at 90% 5%, rgba(66, 103, 178, 0.15), transparent 50%),
      linear-gradient(to bottom, #0a1628 0%, #0f2240 18%, #1a3a6e 38%, #3b6cb5 58%, #8bb4e8 78%, #e8f0fc 94%, #f5f8ff 100%)
    `,
    headerDark: true,
    badge: 'bg-[#1877F2]/20 text-[#a5c9ff] border-[#1877F2]/40',
  },
  tiktok: {
    background: `
      radial-gradient(ellipse 80% 50% at 15% 0%, rgba(255, 0, 80, 0.2), transparent 52%),
      radial-gradient(ellipse 70% 45% at 85% 8%, rgba(0, 242, 234, 0.14), transparent 48%),
      radial-gradient(ellipse 60% 40% at 50% 12%, rgba(168, 85, 247, 0.12), transparent 55%),
      linear-gradient(to bottom, #0c0814 0%, #1a0a1e 15%, #2d1238 32%, #5a2060 50%, #9b4d8a 68%, #d4a0c8 84%, #f5e8f2 96%, #fff5fa 100%)
    `,
    headerDark: true,
    badge: 'bg-[#ff0050]/15 text-[#ffb3cc] border-[#ff0050]/35',
  },
  topics: {
    background: `
      radial-gradient(ellipse 90% 55% at 15% 0%, rgba(24, 119, 242, 0.14), transparent 52%),
      radial-gradient(ellipse 70% 45% at 85% 2%, rgba(255, 0, 80, 0.1), transparent 48%),
      radial-gradient(ellipse 80% 50% at 50% 8%, rgba(103, 232, 249, 0.08), transparent 55%),
      linear-gradient(to bottom, #121826 0%, #141c2e 10%, #1a2438 22%, #1e2a40 35%, #243048 46%, #2a3650 55%, #3d4f68 62%, #5a6d86 72%, #7d8fa3 82%, #a8b4c4 90%, #d0d8e4 96%, #eef2f7 100%)
    `,
    headerDark: true,
    badge: 'bg-slate-800/80 text-slate-300 border-slate-600/60',
  },
}

const ThemedPageShell = ({ theme = 'topics', children, className = '' }) => {
  const cfg = THEME_STYLES[theme] || THEME_STYLES.topics

  return (
    <div
      className={`min-h-screen -mx-4 lg:-mx-8 px-4 lg:px-8 py-6 lg:py-10 ${className}`}
      style={{ background: cfg.background }}
    >
      <div className="max-w-7xl mx-auto space-y-5 lg:space-y-8">
        {typeof children === 'function' ? children(cfg) : children}
      </div>
    </div>
  )
}

export { THEME_STYLES }
export default ThemedPageShell
