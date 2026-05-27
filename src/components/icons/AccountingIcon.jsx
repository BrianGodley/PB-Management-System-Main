// src/components/icons/AccountingIcon.jsx
//
// Flat-style "Accounting" icon — a yellow coin-style circle with a dollar
// sign on the left and a small green calculator on the right. No wide
// bottom "=" bar on the calculator (uniform button grid only). Palette
// matches the other custom nav icons.
//
// Pass a `size` prop (default 20) to override.
//
//   { path: '/accounting', label: 'Accounting', icon: <AccountingIcon /> }
export default function AccountingIcon({ size = 20, className = '' }) {
  // Shared palette
  const coin = '#F4C542'
  const coinStroke = '#C68A12'
  const dollar = '#2F3A2E'         // deep ink color for the $
  const calcBody = '#4CAF74'       // green calculator body
  const calcStroke = '#2F7A4E'
  const screen = '#E8F5EE'         // pale screen
  const screenStroke = '#2F7A4E'
  const button = '#F4C542'         // yellow buttons echoing the coin
  const buttonStroke = '#C68A12'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-3px' }}
    >
      {/* Coin background — large yellow circle */}
      <circle
        cx="16" cy="16" r="14"
        fill={coin}
        stroke={coinStroke}
        strokeWidth="1.2"
      />

      {/* Dollar sign on the left */}
      <text
        x="10" y="22.5"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="15"
        fill={dollar}
      >
        $
      </text>

      {/* Calculator body — rounded rect on the right */}
      <rect
        x="17" y="11"
        width="11" height="13"
        rx="1.4"
        fill={calcBody}
        stroke={calcStroke}
        strokeWidth="0.8"
      />

      {/* Calculator screen */}
      <rect
        x="18.4" y="12.4"
        width="8.2" height="3"
        rx="0.4"
        fill={screen}
        stroke={screenStroke}
        strokeWidth="0.4"
      />

      {/* Button grid — 3 cols x 3 rows, all uniform (no wide bottom bar) */}
      {[0, 1, 2].map(row =>
        [0, 1, 2].map(col => (
          <rect
            key={`${row}-${col}`}
            x={18.4 + col * 2.8}
            y={16.4 + row * 2.4}
            width="2.0"
            height="1.7"
            rx="0.3"
            fill={button}
            stroke={buttonStroke}
            strokeWidth="0.3"
          />
        ))
      )}
    </svg>
  )
}
