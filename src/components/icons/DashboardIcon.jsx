// src/components/icons/DashboardIcon.jsx
//
// Flat-style "Dashboard" icon — a soft blue circle background with a 2x2
// grid of rounded squares. Three squares are solid blue; the bottom-right
// square is a lighter blue with a plus sign in it (the classic "add a
// widget / tile" affordance).
//
// Pass a `size` prop (default 20) to override.
//
//   { path: '/', label: 'Dashboard', icon: <DashboardIcon /> }
export default function DashboardIcon({ size = 20, className = '' }) {
  // Shared palette
  const bg = '#DCE7FB'              // soft blue circle background
  const bgStroke = '#B7CDF3'
  const tile = '#1A6CFF'            // bold blue tile
  const tileLight = '#B7CDF3'       // lighter "add" tile
  const plus = '#1A6CFF'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-3px' }}
    >
      {/* Soft blue circle background */}
      <circle
        cx="16" cy="16" r="14"
        fill={bg}
        stroke={bgStroke}
        strokeWidth="0.8"
      />

      {/* 2x2 grid of rounded tiles */}
      <rect x="8.5"  y="8.5"  width="6.5" height="6.5" rx="1.1" fill={tile} />
      <rect x="17"   y="8.5"  width="6.5" height="6.5" rx="1.1" fill={tile} />
      <rect x="8.5"  y="17"   width="6.5" height="6.5" rx="1.1" fill={tile} />

      {/* Bottom-right "add" tile — lighter shade with plus */}
      <rect x="17" y="17" width="6.5" height="6.5" rx="1.1" fill={tileLight} />
      {/* Plus sign on the add tile */}
      <line x1="20.25" y1="18.6" x2="20.25" y2="21.9" stroke={plus} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="18.6"  y1="20.25" x2="21.9" y2="20.25" stroke={plus} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
