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

const FONT_FAMILY = {
  sans: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "Courier New", monospace',
  arial: 'Arial, Helvetica, sans-serif',
  helvetica: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  verdana: 'Verdana, Geneva, sans-serif',
  tahoma: 'Tahoma, Geneva, sans-serif',
  trebuchet: '"Trebuchet MS", Tahoma, sans-serif',
  calibri: 'Calibri, Candara, Segoe, sans-serif',
  times: '"Times New Roman", Times, serif',
  georgia: 'Georgia, serif',
  garamond: 'Garamond, "Times New Roman", serif',
  palatino: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
  courier: '"Courier New", Courier, monospace',
  comic: '"Comic Sans MS", "Comic Sans", cursive',
  impact: 'Impact, Haettenschweiler, sans-serif',
}

// Resolve per-field text styling (family / bold / italic) stored on a node,
// applying per-field defaults when the user hasn't chosen. Defaults are all
// non-bold / non-italic.
function styleFor(node, field, opts = {}) {
  const { family: defFamily = 'sans', weight: defWeight = 400 } = opts
  const s = (node.text_styles || {})[field] || {}
  const famKey = s.family || defFamily
  return {
    fontFamily: FONT_FAMILY[famKey] || undefined,
    fontWeight: s.bold === true ? 700 : s.bold === false ? 400 : defWeight,
    fontStyle: s.italic ? 'italic' : 'normal',
  }
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
        fontSize={fs.title || 12}
        {...styleFor(node, 'title', { family: 'palatino' })}
      >
        {positionTitle || node.label || '(no position)'}
      </text>
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2 + 8}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={fs.name || 10}
        opacity={0.9}
        {...styleFor(node, 'name', { family: 'sans' })}
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
  // Fill style: 'solid' = colored fill, 'border' (default) = white fill with
  // a colored border of the chosen thickness. "No color" = black outline.
  const noColor = node.bg_color === 'none'
  const color = node.bg_color || '#1E293B'
  const bs = node.box_style || {}
  const solid = !noColor && bs.fill === 'solid'
  const fill = noColor ? 'none' : solid ? color : '#FFFFFF'
  const borderColor = noColor ? '#111111' : solid ? 'rgba(0,0,0,0.12)' : color
  const borderW = solid ? 1 : noColor ? 1.5 : Number.isFinite(bs.borderWidth) ? bs.borderWidth : 2
  const textColor = solid ? pickTextColor(color) : '#1E293B'
  const cx = box.x + box.width / 2
  const hasPosition = !!positionTitle
  const fs = node.font_sizes || {}
  const labelY = hasPosition ? box.y + box.height / 2 - 12 : box.y + box.height / 2 + 3
  // A little breathing room below a second title before the position info.
  const posShift = (node.heading || '').trim() ? 8 : 0
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
        stroke={borderColor}
        strokeWidth={borderW}
      />
      {/* Two centered titles: the Area name (title 1) and an optional
          second title (stored in `heading`). Both wrap to fit the box. */}
      {(() => {
        const t1Size = fs.label || 12
        const t2 = (node.heading || '').trim()
        const t2Size = fs.heading || 14
        const fit = sz => Math.max(4, Math.floor((box.width - 12) / (sz * 0.57)))
        const isJunior = !!node.parent_container_id
        const t1Lines = wrapLabel(node.label, fit(t1Size))
        // For attached junior areas, the second title renders VERTICALLY
        // (rotated) so it fits the narrow column without wrapping; only the
        // name (title 1) stacks horizontally here.
        const t2Lines = t2 && !isJunior ? wrapLabel(t2, fit(t2Size)) : []
        const lh1 = t1Size + 2
        const lh2 = t2Size + 2
        const blockH = t1Lines.length * lh1 + t2Lines.length * lh2
        // Pull the name toward the top when there's a second title (stacked or
        // the junior's vertical one); otherwise keep it centered.
        let y =
          t2Lines.length > 0 || (isJunior && t2)
            ? box.y + 12 + t1Size
            : labelY - blockH / 2 + t1Size
        const rows = []
        t1Lines.forEach((ln, i) => {
          rows.push({ ln, y, size: t1Size, field: 'label', family: 'arial', weight: 400, key: `t1-${i}` })
          y += lh1
        })
        t2Lines.forEach((ln, i) => {
          rows.push({ ln, y, size: t2Size, field: 'heading', family: 'sans', weight: 700, key: `t2-${i}` })
          y += lh2
        })
        // Centre the vertical second title in the space below the name.
        const vMidY = (y - lh1 / 2 + box.y + box.height) / 2
        return (
          <>
            <text textAnchor="middle" fill={textColor}>
              {rows.map(r => (
                <tspan
                  key={r.key}
                  x={cx}
                  y={r.y}
                  fontSize={r.size}
                  {...styleFor(node, r.field, { family: r.family, weight: r.weight })}
                >
                  {r.ln}
                </tspan>
              ))}
            </text>
            {isJunior && t2 && (
              <text
                x={cx}
                y={vMidY}
                textAnchor="middle"
                fill={textColor}
                fontSize={t2Size}
                transform={`rotate(-90 ${cx} ${vMidY})`}
                {...styleFor(node, 'heading', { family: 'sans', weight: 700 })}
              >
                {t2}
              </text>
            )}
          </>
        )
      })()}
      {hasPosition && (
        <>
          <text
            x={cx}
            y={box.y + box.height / 2 + 6 + posShift}
            textAnchor="middle"
            fill={textColor}
            opacity={0.9}
            fontSize={fs.title || 10}
            {...styleFor(node, 'title', { family: 'sans' })}
          >
            {positionTitle}
          </text>
          <text
            x={cx}
            y={box.y + box.height / 2 + 18 + posShift}
            textAnchor="middle"
            fill={textColor}
            opacity={0.75}
            fontSize={fs.name || 10}
            {...styleFor(node, 'name', { family: 'sans' })}
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
