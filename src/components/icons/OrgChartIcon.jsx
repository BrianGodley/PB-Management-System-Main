// src/components/icons/OrgChartIcon.jsx
//
// Flat-style org chart icon — one person on top connected by lines down to
// three people below. Peach skin-tone heads, colored shirts (green leader,
// pink/blue/yellow reports). Designed to sit alongside emoji icons in the
// main nav at ~20px and still read clearly. Pass a `size` prop (default 20)
// to override.
//
// Use anywhere a React node icon is accepted:
//   { path: '/org-chart', label: 'Org Chart', icon: <OrgChartIcon /> }
export default function OrgChartIcon({ size = 20, className = '' }) {
  // Shared colors
  const skin = '#F2C9A1'
  const skinStroke = '#B8895E'
  const lineColor = '#4B5563'

  // Person glyph helper — head circle + rounded-shoulder body
  const Person = ({ cx, cy, shirt, shirtStroke }) => (
    <g>
      {/* Head */}
      <circle
        cx={cx} cy={cy} r="2.4"
        fill={skin}
        stroke={skinStroke}
        strokeWidth="0.4"
      />
      {/* Body / shoulders — rounded shape just below head */}
      <path
        d={`M ${cx - 3.2} ${cy + 5.4}
            Q ${cx - 3.2} ${cy + 2.6} ${cx} ${cy + 2.6}
            Q ${cx + 3.2} ${cy + 2.6} ${cx + 3.2} ${cy + 5.4}
            Z`}
        fill={shirt}
        stroke={shirtStroke}
        strokeWidth="0.4"
      />
    </g>
  )

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-3px' }}
    >
      {/* Connecting lines — drawn first so heads/shoulders sit on top */}
      {/* Vertical drop from top person down to horizontal bar */}
      <line x1="16" y1="11" x2="16" y2="17" stroke={lineColor} strokeWidth="1" strokeLinecap="round" />
      {/* Horizontal bar across the three reports */}
      <line x1="6" y1="17" x2="26" y2="17" stroke={lineColor} strokeWidth="1" strokeLinecap="round" />
      {/* Three short drops to each report */}
      <line x1="6"  y1="17" x2="6"  y2="20" stroke={lineColor} strokeWidth="1" strokeLinecap="round" />
      <line x1="16" y1="17" x2="16" y2="20" stroke={lineColor} strokeWidth="1" strokeLinecap="round" />
      <line x1="26" y1="17" x2="26" y2="20" stroke={lineColor} strokeWidth="1" strokeLinecap="round" />

      {/* Top person — green shirt (leader) */}
      <Person cx={16} cy={6} shirt="#4CAF74" shirtStroke="#2F7A4E" />

      {/* Bottom row — pink, blue, yellow */}
      <Person cx={6}  cy={23} shirt="#EC7C9C" shirtStroke="#B85577" />
      <Person cx={16} cy={23} shirt="#5AB9E8" shirtStroke="#3E8AB0" />
      <Person cx={26} cy={23} shirt="#F4C542" shirtStroke="#C28F12" />
    </svg>
  )
}
