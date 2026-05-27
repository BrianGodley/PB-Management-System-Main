// src/components/icons/HRIcon.jsx
//
// HR nav icon — renders the user-supplied hr.png at whatever size the nav
// requests. Vite bundles the image via the import below.
//
//   { path: '/hr', label: 'HR', icon: <HRIcon /> }
import hrUrl from '../../assets/icons/hr.png'

export default function HRIcon({ size = 20, className = '' }) {
  return (
    <img
      src={hrUrl}
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-3px', objectFit: 'contain' }}
    />
  )
}
