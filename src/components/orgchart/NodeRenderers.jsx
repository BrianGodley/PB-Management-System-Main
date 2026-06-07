// SVG renderers for each node ("Item") kind. Compact sizing (~25% of v1).
import { pickTextColor } from './palette.js'

const UNASSIGNED_LABEL = 'Held from Above'

// Word-wrap a label into lines that fit within maxChars. Falls back to a
// hard break for single words longer than the line. Used so Area names
// that don't fit on one line wrap instead of overflowing the box.
function wrapLabel(text, maxChars) {
  const limit = Math.max(4, maxChars)
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let cur = ''
  for (let w of words) {
    while (w.length > limit) {
      // very long single word — hard-break it
      if (cur) { lines.push(cur); cur = '' }
      lines.push(w.slice(0, limit))
      w = w.slice(limit)
    }
    if (!cur) cur = w
    else if ((cur + ' ' + w).length <= limit) cur += ' ' + w
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

function SelectOutline({ x, y, w, h, selected }) {
  if (!selected) return null
  return (
    <rect
      x={x - 3}
      y={y - 3}
      width={w + 6}
      height={h + 6}
      rx={10}
      ry={10}
      fill="none"
      stroke="#2563EB"
      strokeWidth={2}
      strokeDasharray="6 4"
    />
  )
}

export function CustomNode({ node, box, color, selected, onClick }) {
  const fill = color || '#64748B'
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <SelectOutline x={box.x} y={box.y} w={box.width} h={box.height} selected={selected} />
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx={8}
        ry={8}
        fill={fill}
      />
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2 - (node.subtitle ? 5 : -3)}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="9"
        fontWeight="600"
      >
        {node.label}
      </text>
      {node.subtitle && (
        <text
          x={box.x + box.width / 2}
          y={box.y + box.height / 2 + 8}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="8"
          opacity={0.85}
        >
          {node.subtitle}
        </text>
      )}
    </g>
  )
}

export function PositionNode({
  node,
  box,
  color,
  selected,
  onClick,
  displayName,
  positionTitle,
}) {
  const fill = color || '#3A5038'
  const name = displayName || UNASSIGNED_LABEL
  const fs = node.font_sizes || {}
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <SelectOutline x={box.x} y={box.y} w={box.width} h={box.height} selected={selected} />
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx={8}
        ry={8}
        fill={fill}
      />
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2 - 4}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={fs.title || 9}
        fontWeight="700"
      >
        {positionTitle || node.label || '(no position)'}
      </text>
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2 + 8}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={fs.name || 8}
        opacity={0.9}
      >
        {name}
      </text>
    </g>
  )
}

// ContainerNode = "Org Chart Area" in the UI. Optional position-in-charge:
//   - heading at the very top (e.g. "Department")
//   - main label in the middle, slightly raised so the position info
//     can sit beneath it
//   - position title in larger text, employee name in smaller text under it
export function ContainerNode({
  node,
  box,
  selected,
  onClick,
  positionTitle,
  displayName,
}) {
  // "No color" areas render as a black outline with a transparent fill,
  // so they read as just the frame of where the colored field would be.
  const noColor = node.bg_color === 'none'
  const fill = noColor ? 'none' : node.bg_color || '#1E293B'
  const textColor = noColor ? '#111111' : pickTextColor(fill)
  const cx = box.x + box.width / 2
  const hasPosition = !!positionTitle
  const fs = node.font_sizes || {}
  const labelY = hasPosition ? box.y + box.height / 2 - 12 : box.y + box.height / 2 + 3
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <SelectOutline x={box.x} y={box.y} w={box.width} h={box.height} selected={selected} />
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx={10}
        ry={10}
        fill={fill}
        pointerEvents="all"
        stroke={noColor ? '#111111' : textColor === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}
        strokeWidth={noColor ? 1.5 : 1}
      />
      {/* Two centered titles: the Area name (title 1) and an optional
          second title (stored in `heading`). Both wrap to fit the box. */}
      {(() => {
        const t1Size = fs.label || 14
        const t2 = (node.heading || '').trim()
        const t2Size = fs.heading || 12
        const fit = sz => Math.max(4, Math.floor((box.width - 12) / (sz * 0.57)))
        const t1Lines = wrapLabel(node.label, fit(t1Size))
        const t2Lines = t2 ? wrapLabel(t2, fit(t2Size)) : []
        const lh1 = t1Size + 2
        const lh2 = t2Size + 2
        const blockH = t1Lines.length * lh1 + t2Lines.length * lh2
        let y = labelY - blockH / 2 + t1Size
        const rows = []
        t1Lines.forEach((ln, i) => {
          rows.push({ ln, y, size: t1Size, weight: 700, key: `t1-${i}` })
          y += lh1
        })
        t2Lines.forEach((ln, i) => {
          rows.push({ ln, y, size: t2Size, weight: 600, key: `t2-${i}` })
          y += lh2
        })
        return (
          <text textAnchor="middle" fill={textColor}>
            {rows.map(r => (
              <tspan key={r.key} x={cx} y={r.y} fontSize={r.size} fontWeight={r.weight}>
                {r.ln}
              </tspan>
            ))}
          </text>
        )
      })()}
      {hasPosition && (
        <>
          <text
            x={cx}
            y={box.y + box.height / 2 + 6}
            textAnchor="middle"
            fill={textColor}
            opacity={0.9}
            fontSize={fs.title || 10}
            fontWeight="600"
          >
            {positionTitle}
          </text>
          <text
            x={cx}
            y={box.y + box.height / 2 + 18}
            textAnchor="middle"
            fill={textColor}
            opacity={0.75}
            fontSize={fs.name || 8}
          >
            {displayName || UNASSIGNED_LABEL}
          </text>
        </>
      )}
      <text
        x={box.x + box.width - 6}
        y={box.y + box.height - 5}
        textAnchor="end"
        fill={textColor}
        opacity={0.5}
        fontSize="6"
      >
        {node.container_mode === 'implicit' ? '◰' : '◱'}
      </text>
    </g>
  )
}
