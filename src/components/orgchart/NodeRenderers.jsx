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
        fontSize={9 * (fs.title || 1)}
        fontWeight="700"
      >
        {positionTitle || node.label || '(no position)'}
      </text>
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2 + 8}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={8 * (fs.name || 1)}
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
      {/* Heading removed — Area name handles section labeling. The name
          wraps onto multiple lines when it doesn't fit the box width. */}
      {(() => {
        const labelSize = 14 * (fs.label || 1)
        const lines = wrapLabel(node.label, Math.floor((box.width - 12) / (labelSize * 0.57)))
        const lineH = labelSize + 2
        const startY = labelY - ((lines.length - 1) * lineH) / 2
        return (
          <text
            textAnchor="middle"
            fill={textColor}
            fontSize={labelSize}
            fontWeight="700"
          >
            {lines.map((ln, i) => (
              <tspan key={i} x={cx} y={startY + i * lineH}>
                {ln}
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
            fontSize={10 * (fs.title || 1)}
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
            fontSize={8 * (fs.name || 1)}
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
