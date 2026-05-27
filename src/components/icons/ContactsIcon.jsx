// src/components/icons/ContactsIcon.jsx
//
// Flat-style "Contacts" icon — a rolodex / address book body in light
// blue-grey with a person silhouette inside, plus four colored tab markers
// on the right edge (grey / blue / peach / green) representing alphabet
// dividers.
//
// Pass a `size` prop (default 20) to override.
//
//   { path: '/contacts', label: 'Contacts', icon: <ContactsIcon /> }
export default function ContactsIcon({ size = 20, className = '' }) {
  // Shared palette
  const book = '#E6ECF2'           // light blue-grey book body
  const bookStroke = '#7E94A7'     // muted slate outline
  const figure = '#C4CFD8'         // person silhouette fill
  const figureStroke = '#7E94A7'

  const tabGrey  = '#C9D2DB'
  const tabBlue  = '#7AA6E6'
  const tabPeach = '#F5BC92'
  const tabGreen = '#9FD2A6'
  const tabStroke = '#7E94A7'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-3px' }}
    >
      {/* Colored tab markers on the right edge — drawn first so the book
          sits on top and clips their inner edge */}
      <rect x="25" y="5"  width="4" height="5"  rx="1" fill={tabGrey}  stroke={tabStroke} strokeWidth="0.6" />
      <rect x="25" y="10" width="4" height="5"  fill={tabBlue}  stroke={tabStroke} strokeWidth="0.6" />
      <rect x="25" y="15" width="4" height="5"  fill={tabPeach} stroke={tabStroke} strokeWidth="0.6" />
      <rect x="25" y="20" width="4" height="6"  rx="1" fill={tabGreen} stroke={tabStroke} strokeWidth="0.6" />

      {/* Book body — rounded rectangle */}
      <rect
        x="3" y="4"
        width="23" height="24"
        rx="3"
        fill={book}
        stroke={bookStroke}
        strokeWidth="1.1"
      />

      {/* Person silhouette: head circle */}
      <circle
        cx="14" cy="14" r="3.2"
        fill={figure}
        stroke={figureStroke}
        strokeWidth="0.9"
      />
      {/* Person silhouette: shoulders (half-ellipse at the bottom of the
          containing circle) */}
      <path
        d="M 7.5 22.5
           Q 14 17.5 20.5 22.5
           Q 17.5 25.5 14 25.5
           Q 10.5 25.5 7.5 22.5 Z"
        fill={figure}
        stroke={figureStroke}
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* Outer thin ring around the person, like the reference */}
      <circle
        cx="14" cy="17" r="9.5"
        fill="none"
        stroke={figureStroke}
        strokeWidth="0.7"
      />
    </svg>
  )
}
