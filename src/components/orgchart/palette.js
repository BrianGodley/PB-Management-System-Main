// Color palette for container node backgrounds. Picked to read well at
// large card sizes and stay legible behind dark + light text.
export const CONTAINER_COLORS = [
  { name: 'Slate',    bg: '#1E293B', text: '#FFFFFF' },
  { name: 'Forest',   bg: '#3A5038', text: '#FFFFFF' },
  { name: 'Ocean',    bg: '#1E40AF', text: '#FFFFFF' },
  { name: 'Plum',     bg: '#7E22CE', text: '#FFFFFF' },
  { name: 'Amber',    bg: '#B45309', text: '#FFFFFF' },
  { name: 'Crimson',  bg: '#B91C1C', text: '#FFFFFF' },
  { name: 'Stone',    bg: '#F1F5F9', text: '#1E293B' },
  { name: 'Sand',     bg: '#FEF3C7', text: '#1E293B' },
  { name: 'Mint',     bg: '#DCFCE7', text: '#1E293B' },
]

export function pickTextColor(bg) {
  const match = CONTAINER_COLORS.find(c => c.bg.toLowerCase() === (bg || '').toLowerCase())
  return match?.text || '#FFFFFF'
}
