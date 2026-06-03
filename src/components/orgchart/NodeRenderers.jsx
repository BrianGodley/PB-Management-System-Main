// SVG renderers for each node kind. Each renderer takes the node record,
// its laid-out box, and a few flags. Kept in one file because they're
// small and share a footer/select-outline.
//
// Position resolution (kind='position') happens upstream — the parent
// passes a `displayName` string already resolved from position_holders.

import { pickTextColor } from './palette.js'

function SelectOutline({ x, y, w, h, selected }) {
  if (!selected) return null
  return (
    <rect
      x={x - 3}
      y={y - 3}
      width={w + 6}
      height={h + 6}
      rx={12}
      ry={12}
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
        rx={10}
        ry={10}
        fill={fill}
      />
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2 - (node.subtitle ? 8 : 0)}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="13"
        fontWeight="600"
      >
        {node.label}
      </text>
      {node.subtitle && (
        <text
          x={box.x + box.width / 2}
          y={box.y + box.height / 2 + 12}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="11"
          opacity={0.85}
        >
          {node.subtitle}
        </text>
      )}
    </g>
  )
}

export function PositionNode({ node, box, color, selected, onClick, displayName, positionTitle }) {
  const fill = color || '#3A5038'
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
      />
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2 - 8}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="13"
        fontWeight="700"
      >
        {positionTitle || node.label || '(no position)'}
      </text>
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2 + 12}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="11"
        opacity={0.9}
      >
        {displayName || '(unassigned)'}
      </text>
    </g>
  )
}

export function ContainerNode({ node, box, selected, onClick }) {
  const fill = node.bg_color || '#1E293B'
  const textColor = pickTextColor(fill)
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <SelectOutline x={box.x} y={box.y} w={box.width} h={box.height} selected={selected} />
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx={12}
        ry={12}
        fill={fill}
        stroke={textColor === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}
        strokeWidth={1}
      />
      {/* Heading (e.g. "Department") top-left */}
      {node.heading && (
        <text
          x={box.x + 14}
          y={box.y + 20}
          fill={textColor}
          opacity={0.7}
          fontSize="10"
          fontWeight="600"
          letterSpacing="0.05em"
        >
          {String(node.heading).toUpperCase()}
        </text>
      )}
      {/* Main label centered */}
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2 + 4}
        textAnchor="middle"
        fill={textColor}
        fontSize="18"
        fontWeight="700"
      >
        {node.label}
      </text>
      {/* Mode badge bottom-right */}
      <text
        x={box.x + box.width - 12}
        y={box.y + box.height - 10}
        textAnchor="end"
        fill={textColor}
        opacity={0.55}
        fontSize="9"
      >
        {node.container_mode === 'implicit' ? '◰ implicit' : '◱ independent'}
      </text>
    </g>
  )
}
