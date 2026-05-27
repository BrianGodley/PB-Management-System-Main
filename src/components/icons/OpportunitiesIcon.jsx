// src/components/icons/OpportunitiesIcon.jsx
//
// Opportunities nav icon — renders the user-supplied handshake.png at
// whatever size the nav requests. Vite bundles the image via the import
// below.
//
//   { path: '/clients', label: 'Opportunities', icon: <OpportunitiesIcon /> }
import handshakeUrl from '../../assets/icons/handshake.jfif'

export default function OpportunitiesIcon({ size = 20, className = '' }) {
  return (
    <img
      src={handshakeUrl}
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-3px', objectFit: 'contain' }}
    />
  )
}
