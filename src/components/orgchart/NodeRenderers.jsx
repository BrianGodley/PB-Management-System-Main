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
  titleSpacing = 0,
  containedPositions = [],
  topAnchored = false,
}) {
  // Fill style: 'solid' = colored fill, 'border' (default) = white fill with
  // a colored border of the chosen thickness. "No color" = black outline.
  const noColor = node.bg_color === 'none'
  const color = node.bg_color || '#1E293B'
  const bs = node.box_style || {}
  // 'none' = text only: no fill and no border (the box still captures clicks
  // via pointerEvents, so it can be selected and dragged).
  const textOnly = bs.fill === 'none'
  const solid = !noColor && !textOnly && bs.fill === 'solid'
  const fill = textOnly || noColor ? 'none' : solid ? color : '#FFFFFF'
  const borderColor = textOnly ? 'none' : noColor ? '#111111' : solid ? 'rgba(0,0,0,0.12)' : color
  const borderW = textOnly
    ? 0
    : solid
      ? 1
      : noColor
        ? 1.5
        : Number.isFinite(bs.borderWidth)
          ? bs.borderWidth
          : 2
  // Corner radius: 'square' = sharp corners, default = rounded.
  const cornerR = bs.corners === 'square' ? 0 : 10
  const textColor = solid ? pickTextColor(color) : '#1E293B'
  const cx = box.x + box.width / 2
  const fs = node.font_sizes || {}
  // Junior (attached) areas can be squeezed very narrow when several share a
  // parent's width. If the in-charge title or the employee name can't fit the
  // box width, don't display EITHER (better blank than overflowing/truncated).
  // Top-level areas always show their in-charge.
  const isJunior = !!node.parent_container_id
  const holderFits = (() => {
    if (!positionTitle) return false
    const avail = box.width - 8
    const titleW = String(positionTitle).length * (fs.title || 10) * 0.58
    const nameW = String(displayName || UNASSIGNED_LABEL).length * (fs.name || 10) * 0.58
    return titleW <= avail && nameW <= avail
  })()
  const hasPosition = !!positionTitle && (!isJunior || holderFits)
  const labelY = hasPosition ? box.y + box.height / 2 - 12 : box.y + box.height / 2 + 3
  // A little breathing room below a second title before the position info.
  const posShift = (node.heading || '').trim() ? 8 : 0
  // In the expanded view boxes are tall, so the in-charge is anchored just below
  // the area titles (top) instead of being vertically centered in the box.
  const szL = fs.label || 12
  const szH = fs.heading || 14
  const titleStackH =
    12 +
    ((node.label || '').trim() ? szL + titleSpacing : 0) +
    ((node.heading || '').trim() ? szH + titleSpacing + 4 : 0)
  const headTitleY = topAnchored
    ? box.y + titleStackH + 8
    : box.y + box.height / 2 + 6 + posShift
  const headNameY = topAnchored ? headTitleY + (fs.title || 10) + 4 : box.y + box.height / 2 + 18 + posShift
  // Note/Data lines shown inside the Area. When notes are present the titles
  // anchor to the TOP (as they do when there's a position in charge) so the
  // notes can flow beneath them instead of overlapping.
  const areaNoteLines = buildNoteLines(node.notes)
  const hasNotes = areaNoteLines.length > 0
  const fitAt = sz => Math.max(4, Math.floor((box.width - 12) / (sz * 0.57)))
  const nT1Lines = (node.label || '').toString().trim()
    ? wrapLabel((node.label || '').toString(), fitAt(szL)).length
    : 0
  const nT2Lines = (node.heading || '').trim()
    ? wrapLabel((node.heading || '').trim(), fitAt(szH)).length
    : 0
  // Only reserve vertical space for titles that actually have text; with both
  // blank the notes start at the top of the box.
  const titlesBottom =
    nT1Lines || nT2Lines
      ? box.y + 12 + nT1Lines * (szL + 2) + (nT2Lines ? titleSpacing + nT2Lines * (szH + 2) : 0)
      : box.y + 4
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <SelectOutline x={box.x} y={box.y} w={box.width} h={box.height} selected={selected} />
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx={cornerR}
        ry={cornerR}
        fill={fill}
        pointerEvents="all"
        stroke={borderColor}
        strokeWidth={borderW}
      />
      {/* Two centered titles: the Area name (title 1) and an optional
          second title (stored in `heading`). Both wrap to fit the box. */}
      {(() => {
        const ts = node.text_styles || {}
        const t1 = (node.label || '').toString()
        const t2 = (node.heading || '').trim()
        const t1Size = fs.label || 12
        const t2Size = fs.heading || 14
        const t1Vert = !!(ts.label && ts.label.vertical)
        const t2Vert = !!(ts.heading && ts.heading.vertical)
        const fit = sz => Math.max(4, Math.floor((box.width - 12) / (sz * 0.57)))

        // Each title renders horizontally (stacked from the top) or vertically
        // (rotated), independently, per its `vertical` setting.
        const hTitles = []
        if (t1 && !t1Vert) hTitles.push({ text: t1, size: t1Size, field: 'label', family: 'arial', weight: 400 })
        if (t2 && !t2Vert) hTitles.push({ text: t2, size: t2Size, field: 'heading', family: 'sans', weight: 700 })
        const vTitles = []
        if (t1 && t1Vert) vTitles.push({ text: t1, size: t1Size, field: 'label', family: 'arial', weight: 400 })
        if (t2 && t2Vert) vTitles.push({ text: t2, size: t2Size, field: 'heading', family: 'sans', weight: 700 })

        const els = []
        if (hTitles.length) {
          const wrapped = hTitles.map(h => ({ ...h, lines: wrapLabel(h.text, fit(h.size)) }))
          const blockH =
            wrapped.reduce((s, h) => s + h.lines.length * (h.size + 2), 0) +
            titleSpacing * Math.max(0, wrapped.length - 1)
          let y =
            vTitles.length > 0 || hTitles.length > 1 || hasNotes
              ? box.y + 12 + wrapped[0].size
              : labelY - blockH / 2 + wrapped[0].size
          const rows = []
          wrapped.forEach((h, hi) => {
            if (hi > 0) y += titleSpacing // breathing room between the two titles
            h.lines.forEach((ln, i) => {
              rows.push({ ln, y, h, key: `${h.field}-${i}-${Math.round(y)}` })
              y += h.size + 2
            })
          })
          els.push(
            <text key="htitles" textAnchor="middle" fill={textColor}>
              {rows.map(r => (
                <tspan
                  key={r.key}
                  x={cx}
                  y={r.y}
                  fontSize={r.h.size}
                  {...styleFor(node, r.h.field, { family: r.h.family, weight: r.h.weight })}
                >
                  {r.ln}
                </tspan>
              ))}
            </text>,
          )
        }
        vTitles.forEach((v, i) => {
          const vx =
            vTitles.length === 1 ? cx : box.x + box.width * (i === 0 ? 0.38 : 0.62)
          const vy = box.y + box.height / 2 + (hTitles.length ? 8 : 0)
          els.push(
            <text
              key={`v-${v.field}`}
              x={vx}
              y={vy}
              textAnchor="middle"
              dominantBaseline="central"
              fill={textColor}
              fontSize={v.size}
              transform={`rotate(-90 ${vx} ${vy})`}
              {...styleFor(node, v.field, { family: v.family, weight: v.weight })}
            >
              {v.text}
            </text>,
          )
        })
        return <>{els}</>
      })()}
      {hasPosition && (
        <>
          <text
            x={cx}
            y={headTitleY}
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
            y={headNameY}
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
      {/* Positions "contained in" this area render INSIDE the box as a stacked
          list, clipped to the box so they never spill out. */}
      {containedPositions.length > 0 && (() => {
        const cpSize = Math.max(8, Math.min(13, fs.title || 11))
        const lineH = cpSize + 6
        const startY = topAnchored
          ? (hasPosition ? headNameY + cpSize + 10 : box.y + titleStackH + 16 + cpSize)
          : (hasPosition ? box.y + box.height / 2 + 30 + posShift : box.y + box.height / 2) + cpSize
        const avail = box.width - 8
        const limit = box.y + box.height - cpSize - 2
        // Flatten the main → junior tree into lines (juniors shown distinctly:
        // indented marker, smaller, lighter). Same fit rule as the area head:
        // only lines that fit the box (horizontally + vertically) are shown, so
        // they hide on the small main-view boxes and appear in the expanded view.
        const flat = []
        containedPositions.forEach(cp => {
          flat.push({ text: cp.name ? `${cp.title} — ${cp.name}` : cp.title, junior: false })
          ;(cp.juniors || []).forEach(j =>
            flat.push({ text: j.name ? `${j.title} — ${j.name}` : j.title, junior: true }),
          )
        })
        const vis = flat
          .filter(it => it.text.length * cpSize * 0.55 <= avail)
          .filter((_, i) => startY + i * lineH <= limit)
        if (!vis.length) return null
        return (
          <g>
            {vis.map((it, i) => (
              <text
                key={i}
                x={cx}
                y={startY + i * lineH}
                textAnchor="middle"
                fill={textColor}
                opacity={it.junior ? 0.7 : 0.92}
                fontSize={it.junior ? Math.max(7, cpSize - 1) : cpSize}
                {...styleFor(node, 'title', { family: 'sans', weight: it.junior ? 400 : 600 })}
              >
                {it.junior ? `› ${it.text}` : it.text}
              </text>
            ))}
          </g>
        )
      })()}
      {/* Note / Data lines added to this Area. Rendered below the titles (and
          the in-charge block when shown), clipped to the box. */}
      {(() => {
        if (!hasNotes) return null
        const defNote = Math.max(7, Math.min(11, (fs.title || 10) - 1))
        const nSize = Number.isFinite(fs.notes) ? fs.notes : defNote
        const lineH = nSize + 3
        const align = ((node.text_styles || {}).notes || {}).align || 'left'
        const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'
        const tx = align === 'center' ? cx : align === 'right' ? box.x + box.width - 6 : box.x + 6
        const fitChars = Math.max(6, Math.floor((box.width - 12) / (nSize * 0.55)))
        const wrapped = areaNoteLines.flatMap(l => wrapLabel(l, fitChars))
        let startY = titlesBottom + 4 + nSize
        if (hasPosition) startY = Math.max(startY, headNameY + nSize + 6)
        if (containedPositions.length) startY = Math.max(startY, box.y + box.height / 2 + nSize)
        const limit = box.y + box.height - 4
        const vis = wrapped.filter((_, i) => startY + i * lineH <= limit)
        if (!vis.length) return null
        return (
          <g>
            {vis.map((ln, i) => (
              <text
                key={`note-${i}`}
                x={tx}
                y={startY + i * lineH}
                textAnchor={anchor}
                fill={textColor}
                opacity={0.9}
                fontSize={nSize}
                {...styleFor(node, 'notes', { family: 'sans' })}
              >
                {ln}
              </text>
            ))}
          </g>
        )
      })()}
    </g>
  )
}

// Flatten a node's notes array into display lines with bullet/number prefixes.
// Each item: { text, format: 'plain' | 'bullet' | 'number' }. A field's text may
// span multiple lines; each non-empty line becomes its own display line.
function buildNoteLines(notes) {
  const out = []
  let num = 0
  ;(Array.isArray(notes) ? notes : []).forEach(item => {
    const fmt = (item && item.format) || 'plain'
    String((item && item.text) || '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .forEach(line => {
        if (fmt === 'bullet') out.push('•  ' + line)
        else if (fmt === 'number') {
          num += 1
          out.push(num + '.  ' + line)
        } else out.push(line)
      })
  })
  return out
}

// Note / Data node — a box like an Area, but with a bold Description at the top
// and a left-aligned list of note/data lines below. Reuses the Area box styling.
export function NoteNode({ node, box, selected, onClick }) {
  const noColor = node.bg_color === 'none'
  const color = node.bg_color || '#1E293B'
  const bs = node.box_style || {}
  // 'none' = text only: no fill and no border (the box still captures clicks
  // via pointerEvents, so it can be selected and dragged).
  const textOnly = bs.fill === 'none'
  const solid = !noColor && !textOnly && bs.fill === 'solid'
  const fill = textOnly || noColor ? 'none' : solid ? color : '#FFFFFF'
  const borderColor = textOnly ? 'none' : noColor ? '#111111' : solid ? 'rgba(0,0,0,0.12)' : color
  const borderW = textOnly
    ? 0
    : solid
      ? 1
      : noColor
        ? 1.5
        : Number.isFinite(bs.borderWidth)
          ? bs.borderWidth
          : 2
  const cornerR = bs.corners === 'square' ? 0 : 10
  const textColor = solid ? pickTextColor(color) : '#1E293B'
  const cx = box.x + box.width / 2
  const fsz = node.font_sizes || {}
  const ts = node.text_styles || {}
  const descSize = Number.isFinite(fsz.label) ? fsz.label : 11
  const noteSize = Number.isFinite(fsz.notes) ? fsz.notes : 9
  const descAlign = (ts.label || {}).align || 'center'
  const noteAlign = (ts.notes || {}).align || 'left'
  const anchorOf = a => (a === 'center' ? 'middle' : a === 'right' ? 'end' : 'start')
  const xOf = a => (a === 'center' ? cx : a === 'right' ? box.x + box.width - 8 : box.x + 8)
  const fitChars = sz => Math.max(6, Math.floor((box.width - 14) / (sz * 0.55)))

  const desc = (node.label || '').trim()
  const descLines = desc ? wrapLabel(desc, fitChars(descSize)) : []
  const noteLines = buildNoteLines(node.notes).flatMap(l => wrapLabel(l, fitChars(noteSize)))

  const descTop = box.y + 16
  const notesTop = descTop + descLines.length * (descSize + 3) + (descLines.length ? 8 : 0)

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <SelectOutline x={box.x} y={box.y} w={box.width} h={box.height} selected={selected} />
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx={cornerR}
        ry={cornerR}
        fill={fill}
        pointerEvents="all"
        stroke={borderColor}
        strokeWidth={borderW}
      />
      {descLines.length > 0 && (
        <text textAnchor={anchorOf(descAlign)} fill={textColor} {...styleFor(node, 'label', { family: 'sans', weight: 700 })}>
          {descLines.map((ln, i) => (
            <tspan key={`d-${i}`} x={xOf(descAlign)} y={descTop + i * (descSize + 3)} fontSize={descSize}>
              {ln}
            </tspan>
          ))}
        </text>
      )}
      {noteLines.length > 0 && (
        <text textAnchor={anchorOf(noteAlign)} fill={textColor} {...styleFor(node, 'notes', { family: 'sans' })}>
          {noteLines.map((ln, i) => (
            <tspan key={`n-${i}`} x={xOf(noteAlign)} y={notesTop + i * (noteSize + 3)} fontSize={noteSize}>
              {ln}
            </tspan>
          ))}
        </text>
      )}
    </g>
  )
}
