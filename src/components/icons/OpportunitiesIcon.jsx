// src/components/icons/OpportunitiesIcon.jsx
//
// Flat-style "opportunities" icon — a document in the background with two
// arms reaching in for a handshake in the foreground, and a small green
// check in the lower-right corner indicating a deal closed / agreement
// reached. Uses the same warm flat palette as SkidSteerIcon and
// OrgChartIcon (yellow / blue / peach skin) so the nav reads as a set.
//
// Pass a `size` prop (default 20) to override.
//
//   { path: '/clients', label: 'Opportunities', icon: <OpportunitiesIcon /> }
export default function OpportunitiesIcon({ size = 20, className = '' }) {
  // Shared palette
  const paper = '#FFFDF5'
  const paperStroke = '#C9B98A'
  const skin = '#F2C9A1'
  const skinStroke = '#B8895E'
  const sleeveLeft = '#5AB9E8'        // blue (matches org chart middle person)
  const sleeveLeftStroke = '#3E8AB0'
  const sleeveRight = '#F4B82C'       // yellow (matches skid steer body)
  const sleeveRightStroke = '#C68A12'
  const check = '#4CAF74'             // green (matches org chart leader)
  const checkStroke = '#2F7A4E'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-3px' }}
    >
      {/* Document in background — rectangle with folded top-right corner */}
      <path
        d="M 8 4
           L 22 4
           L 26 8
           L 26 26
           L 8 26
           Z"
        fill={paper}
        stroke={paperStroke}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Folded corner accent */}
      <path
        d="M 22 4 L 22 8 L 26 8"
        fill="none"
        stroke={paperStroke}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      {/* Left sleeve / forearm — blue */}
      <path
        d="M 2 18
           L 10 14
           L 14 17
           L 6 21
           Z"
        fill={sleeveLeft}
        stroke={sleeveLeftStroke}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />

      {/* Right sleeve / forearm — yellow */}
      <path
        d="M 30 18
           L 22 14
           L 18 17
           L 26 21
           Z"
        fill={sleeveRight}
        stroke={sleeveRightStroke}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />

      {/* Clasped hands — single peach shape in the middle */}
      <path
        d="M 10 14
           Q 13 13 16 15
           Q 19 13 22 14
           L 22 19
           Q 19 21 16 19
           Q 13 21 10 19
           Z"
        fill={skin}
        stroke={skinStroke}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      {/* Thumb / grip line across the clasp for definition */}
      <path
        d="M 12 17 Q 16 18.5 20 17"
        fill="none"
        stroke={skinStroke}
        strokeWidth="0.5"
        strokeLinecap="round"
      />

      {/* Green check badge in lower-right corner */}
      <circle
        cx="25" cy="25" r="4.5"
        fill={check}
        stroke={checkStroke}
        strokeWidth="0.6"
      />
      <path
        d="M 22.6 25.2 L 24.4 27 L 27.4 23.6"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
