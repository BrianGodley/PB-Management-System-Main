// src/components/icons/OrgChartIcon.jsx
//
// Flat-style org chart icon — one filled box on top connected by lines
// down to three filled boxes below. Boxes are colored in the same warm
// palette as the other custom nav icons (green leader, pink/blue/yellow
// reports). Bold dark outline for legibility at ~20px.
//
//   { path: '/org-chart', label: 'Org Chart', icon: <OrgChartIcon /> }
export default function OrgChartIcon({ size = 20, className = '' }) {
  const outline = '#3A3A3A'
  const lineColor = '#3A3A3A'
  const SW = 1.1

  // Box colors — green leader on top, pink/blue/yellow reports
  const leaderFill = '#4CAF74'
  const leaderStroke = '#2F7A4E'
  const pinkFill = '#EC7C9C'
  const pinkStroke = '#B85577'
  const blueFill = '#5AB9E8'
  const blueStroke = '#3E8AB0'
  const yellowFill = '#F4C542'
  const yellowStroke = '#C28F12'

  // Box geometry
  const boxW = 8
  const boxH = 7
  const topX = 12       // centered top box: (32 - 8) / 2 = 12
  const topY = 3
  const bottomY = 19
  const leftX = 2
  const midX = 12
  const rightX = 22

  // Center anchors for connector lines
  const topCx = topX + boxW / 2          // 16
  const topBottomY = topY + boxH          // 10
  const barY = 14.5
  const leftCx = leftX + boxW / 2         // 6
  const midCx = midX + boxW / 2           // 16
  const rightCx = rightX + boxW / 2       // 26

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-3px' }}
    >
      {/* Connector lines — drawn first so boxes sit on top */}
      {/* Drop from top box down to the horizontal bar */}
      <line x1={topCx} y1={topBottomY} x2={topCx} y2={barY} stroke={lineColor} strokeWidth={SW} strokeLinecap="round" />
      {/* Horizontal bar across the three reports */}
      <line x1={leftCx} y1={barY} x2={rightCx} y2={barY} stroke={lineColor} strokeWidth={SW} strokeLinecap="round" />
      {/* Drops to each report box */}
      <line x1={leftCx}  y1={barY} x2={leftCx}  y2={bottomY} stroke={lineColor} strokeWidth={SW} strokeLinecap="round" />
      <line x1={midCx}   y1={barY} x2={midCx}   y2={bottomY} stroke={lineColor} strokeWidth={SW} strokeLinecap="round" />
      <line x1={rightCx} y1={barY} x2={rightCx} y2={bottomY} stroke={lineColor} strokeWidth={SW} strokeLinecap="round" />

      {/* Top box — green leader */}
      <rect x={topX} y={topY} width={boxW} height={boxH} rx="1" fill={leaderFill} stroke={leaderStroke} strokeWidth={SW} />

      {/* Bottom row — pink, blue, yellow */}
      <rect x={leftX}  y={bottomY} width={boxW} height={boxH} rx="1" fill={pinkFill}   stroke={pinkStroke}   strokeWidth={SW} />
      <rect x={midX}   y={bottomY} width={boxW} height={boxH} rx="1" fill={blueFill}   stroke={blueStroke}   strokeWidth={SW} />
      <rect x={rightX} y={bottomY} width={boxW} height={boxH} rx="1" fill={yellowFill} stroke={yellowStroke} strokeWidth={SW} />
    </svg>
  )
}
