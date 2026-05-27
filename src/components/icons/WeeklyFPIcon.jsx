// src/components/icons/WeeklyFPIcon.jsx
//
// Flat-style "Weekly FP" (financial plan / forecast) icon — a clipboard with
// a red clip and checklist rows in the background, plus a yellow dollar coin
// badge in the lower-right corner. Palette matches the other custom nav
// icons (SkidSteer, OrgChart, Opportunities).
//
// Pass a `size` prop (default 20) to override.
//
//   { path: '/collections', label: 'Weekly FP', icon: <WeeklyFPIcon /> }
export default function WeeklyFPIcon({ size = 20, className = '' }) {
  // Shared palette
  const paper = '#FFFDF5'
  const paperStroke = '#9C8A5A'
  const clip = '#E25C5C'
  const clipStroke = '#A83333'
  const bullet = '#F4B82C'         // yellow bullets, matches skid steer
  const bulletStroke = '#C68A12'
  const line = '#9C8A5A'           // muted text-line color
  const coin = '#F4B82C'
  const coinStroke = '#C68A12'
  const coinInner = '#F9D169'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-3px' }}
    >
      {/* Clipboard body */}
      <rect
        x="5" y="6"
        width="18" height="22"
        rx="2"
        fill={paper}
        stroke={paperStroke}
        strokeWidth="0.8"
      />

      {/* Red clip at the top */}
      <rect
        x="11" y="3"
        width="6" height="5"
        rx="1"
        fill={clip}
        stroke={clipStroke}
        strokeWidth="0.6"
      />
      {/* Clip notch */}
      <rect
        x="12.5" y="2"
        width="3" height="2"
        rx="0.5"
        fill={clip}
        stroke={clipStroke}
        strokeWidth="0.5"
      />

      {/* Checklist rows — square bullet + line */}
      {/* Row 1 */}
      <rect x="8" y="11" width="2.4" height="2.4" rx="0.4" fill={bullet} stroke={bulletStroke} strokeWidth="0.4" />
      <line x1="11.6" y1="12.2" x2="19" y2="12.2" stroke={line} strokeWidth="1" strokeLinecap="round" />
      {/* Row 2 */}
      <rect x="8" y="15" width="2.4" height="2.4" rx="0.4" fill={bullet} stroke={bulletStroke} strokeWidth="0.4" />
      <line x1="11.6" y1="16.2" x2="19" y2="16.2" stroke={line} strokeWidth="1" strokeLinecap="round" />
      {/* Row 3 */}
      <rect x="8" y="19" width="2.4" height="2.4" rx="0.4" fill={bullet} stroke={bulletStroke} strokeWidth="0.4" />
      <line x1="11.6" y1="20.2" x2="17" y2="20.2" stroke={line} strokeWidth="1" strokeLinecap="round" />

      {/* Dollar coin badge in lower-right — outer ring, inner ring, $ */}
      <circle cx="24" cy="24" r="6" fill={coin} stroke={coinStroke} strokeWidth="0.8" />
      <circle cx="24" cy="24" r="4.4" fill={coinInner} stroke={coinStroke} strokeWidth="0.5" />
      <text
        x="24" y="26.6"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="6"
        fill={coinStroke}
      >
        $
      </text>
    </svg>
  )
}
