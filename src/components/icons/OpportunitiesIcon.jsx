// src/components/icons/OpportunitiesIcon.jsx
//
// Flat-style "opportunities" icon — two arms reaching in for a handshake,
// no background document, no checkmark. Soft mint and green cuffs with
// peach skin-tone hands clasped in the middle. Bold dark outline to match
// the reference. Palette stays in the warm/flat family used by the other
// custom nav icons.
//
// Pass a `size` prop (default 20) to override.
//
//   { path: '/clients', label: 'Opportunities', icon: <OpportunitiesIcon /> }
export default function OpportunitiesIcon({ size = 20, className = '' }) {
  // Shared palette
  const skin = '#F2C9A1'
  const cuffLeft = '#A8E6D4'        // soft mint
  const cuffRight = '#9FD9A6'       // soft green
  const outline = '#3A3A3A'         // bold dark outline
  const buttonDot = '#3A3A3A'
  const buttonRing = '#FFFFFF'
  const strokeW = 1.1

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-3px' }}
    >
      {/* Left cuff — mint rectangle angling in from the lower-left */}
      <path
        d="M 2 22
           L 10 14
           L 14 18
           L 6 26
           Z"
        fill={cuffLeft}
        stroke={outline}
        strokeWidth={strokeW}
        strokeLinejoin="round"
      />
      {/* Left cuff button */}
      <circle cx="4.5" cy="23.5" r="0.9" fill={buttonRing} stroke={outline} strokeWidth="0.6" />
      <circle cx="4.5" cy="23.5" r="0.35" fill={buttonDot} />

      {/* Right cuff — green rectangle angling in from the upper-right */}
      <path
        d="M 30 10
           L 22 18
           L 18 14
           L 26 6
           Z"
        fill={cuffRight}
        stroke={outline}
        strokeWidth={strokeW}
        strokeLinejoin="round"
      />
      {/* Right cuff button */}
      <circle cx="27.5" cy="8.5" r="0.9" fill={buttonRing} stroke={outline} strokeWidth="0.6" />
      <circle cx="27.5" cy="8.5" r="0.35" fill={buttonDot} />

      {/* Left forearm/hand — extends from left cuff into the clasp */}
      <path
        d="M 10 14
           L 14 18
           Q 16 19.5 19 19
           Q 21 18.6 22 18
           L 18 14
           Q 16 13 13.5 13.2
           Q 11.5 13.4 10 14 Z"
        fill={skin}
        stroke={outline}
        strokeWidth={strokeW}
        strokeLinejoin="round"
      />

      {/* Right forearm/hand — extends from right cuff into the clasp,
          drawn second so it sits in front of the left hand (thumb on top) */}
      <path
        d="M 22 18
           L 18 14
           Q 16.5 12.5 14 13
           Q 12 13.4 11 14
           Q 12.5 15 14.5 15.8
           Q 17 16.8 19 17.4
           Q 21 18 22 18 Z"
        fill={skin}
        stroke={outline}
        strokeWidth={strokeW}
        strokeLinejoin="round"
      />

      {/* Finger separations on the front (right) hand for definition */}
      <path d="M 13 14.4 Q 14.4 15.4 15.8 16.0" fill="none" stroke={outline} strokeWidth="0.55" strokeLinecap="round" />
      <path d="M 14.6 13.6 Q 16.0 14.6 17.3 15.2" fill="none" stroke={outline} strokeWidth="0.55" strokeLinecap="round" />
    </svg>
  )
}
