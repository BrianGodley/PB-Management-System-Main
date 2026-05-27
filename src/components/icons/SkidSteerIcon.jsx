// src/components/icons/SkidSteerIcon.jsx
//
// Compact flat-style skid steer (CTL) — yellow body, blue cab window,
// rubber tracks with grey rollers, forward-extended boom + bucket.
// Designed to sit alongside emoji icons in the main nav at ~20px and
// still read clearly. Pass a `size` prop (default 20) to override.
//
// Use anywhere a React node icon is accepted:
//   { path: '/equipment-tracking', label: 'Equipment', icon: <SkidSteerIcon /> }
export default function SkidSteerIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 28"
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-3px' }}
    >
      {/* Boom arm — yellow tube reaching from upper-back of cab down to bucket */}
      <path
        d="M 15 11  Q 22 9 26 14  L 28 18  L 27 19  L 25 17  Q 21 12 14 13 Z"
        fill="#F4B82C"
        stroke="#C68A12"
        strokeWidth="0.6"
      />
      {/* Bucket at the end of the arm */}
      <path
        d="M 26 17  L 30 19  L 30 22  L 26 22  Z"
        fill="#F4B82C"
        stroke="#A26F0E"
        strokeWidth="0.6"
      />

      {/* Cab body — rounded rectangle */}
      <rect
        x="3" y="6" width="14" height="11"
        rx="2"
        fill="#F4B82C"
        stroke="#C68A12"
        strokeWidth="0.6"
      />

      {/* Three-pane blue cab window */}
      <rect x="5" y="8" width="3.2" height="4.2" rx="0.4" fill="#5AB9E8" stroke="#3E8AB0" strokeWidth="0.4" />
      <rect x="8.6" y="8" width="3.2" height="4.2" rx="0.4" fill="#5AB9E8" stroke="#3E8AB0" strokeWidth="0.4" />
      <rect x="12.2" y="8" width="3.2" height="4.2" rx="0.4" fill="#5AB9E8" stroke="#3E8AB0" strokeWidth="0.4" />

      {/* Body lower-trim stripe */}
      <rect x="3.5" y="14" width="13" height="2" rx="0.3" fill="#D89A14" />

      {/* Rubber track — long rounded pill underneath */}
      <rect x="1" y="18" width="18" height="6" rx="3" fill="#2B2B2B" />

      {/* Track rollers — three grey circles */}
      <circle cx="4.5" cy="21" r="1.6" fill="#9CA3AF" stroke="#4B5563" strokeWidth="0.4" />
      <circle cx="10"  cy="21" r="1.6" fill="#9CA3AF" stroke="#4B5563" strokeWidth="0.4" />
      <circle cx="15.5" cy="21" r="1.6" fill="#9CA3AF" stroke="#4B5563" strokeWidth="0.4" />
    </svg>
  )
}
