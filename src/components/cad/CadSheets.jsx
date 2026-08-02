/*
 * CadSheets.jsx — Plan-set sheet manager, live preview + PDF plot
 * --------------------------------------------------------------
 * Lays the CAD model out onto paper "sheets" (paper size + title block +
 * scale). A left rail manages the sheet list, the center shows a live SVG
 * preview of the ACTIVE sheet (the same layout math the PDF plotter uses),
 * and the right rail edits the active sheet's properties. Any edit calls
 * onChange(nextSheets) with the full updated array.
 *
 * Contract:
 *   <CadSheets unit layers entities drawingName sheets onChange onExit />
 *   - sheets: array of sheet objects (may be empty)
 *   - onChange(nextSheets): called on ANY edit (add/delete/reorder/field/view)
 *   - onExit(): return to the drawing canvas
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  PAPER_SIZES,
  SCALE_PRESETS,
  newSheet,
  pageDims,
  sheetLayout,
  worldToPaper,
  fitView,
  scaleLabel,
  plotSheetsToPdf,
} from './sheets';

const GREEN = '#3A5038';

// Title-block field rows (label, value-from-sheet) — mirrors drawSheet() in sheets.js.
function tbLines(sheet, drawingName) {
  const tb = sheet.titleBlock || {};
  return [
    ['PROJECT', tb.project || drawingName || '—'],
    ['CLIENT', tb.client || '—'],
    ['ADDRESS', tb.address || '—'],
    ['SHEET', `${sheet.name || ''}`.trim() || '—'],
    ['SHEET NO.', sheet.number || '—'],
    ['SCALE', scaleLabel(sheet.view?.scale || 0)],
    ['DATE', tb.date || '—'],
    ['DRAWN BY', tb.drawnBy || '—'],
    ['REVISION', tb.revision || '—'],
  ];
}

export default function CadSheets({ unit, layers, entities, drawingName, sheets, onChange, onExit }) {
  const list = Array.isArray(sheets) ? sheets : [];

  // -------- active sheet selection ----------------------------------------
  const [activeId, setActiveId] = useState(list[0] ? list[0].id : null);

  // keep activeId valid as the list changes (delete / external update)
  useEffect(() => {
    if (!list.length) {
      if (activeId !== null) setActiveId(null);
      return;
    }
    if (!list.some((s) => s.id === activeId)) {
      setActiveId(list[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  const active = useMemo(() => list.find((s) => s.id === activeId) || list[0] || null, [list, activeId]);

  // -------- mutation helpers ----------------------------------------------
  const patchActive = useCallback(
    (patch) => {
      if (!active) return;
      onChange(list.map((s) => (s.id === active.id ? { ...s, ...patch } : s)));
    },
    [active, list, onChange]
  );
  const patchView = useCallback(
    (vpatch) => {
      if (!active) return;
      onChange(list.map((s) => (s.id === active.id ? { ...s, view: { ...s.view, ...vpatch } } : s)));
    },
    [active, list, onChange]
  );
  const patchTB = useCallback(
    (tpatch) => {
      if (!active) return;
      onChange(list.map((s) => (s.id === active.id ? { ...s, titleBlock: { ...s.titleBlock, ...tpatch } } : s)));
    },
    [active, list, onChange]
  );

  const addSheet = useCallback(() => {
    const s = newSheet(list.length + 1, 'ARCH_D');
    s.view = fitView(entities, s);
    onChange([...list, s]);
    setActiveId(s.id);
  }, [list, entities, onChange]);

  const deleteSheet = useCallback(
    (id) => {
      const idx = list.findIndex((s) => s.id === id);
      const next = list.filter((s) => s.id !== id);
      onChange(next);
      if (activeId === id) {
        const neighbor = next[Math.min(idx, next.length - 1)];
        setActiveId(neighbor ? neighbor.id : null);
      }
    },
    [list, activeId, onChange]
  );

  const moveSheet = useCallback(
    (id, dir) => {
      const idx = list.findIndex((s) => s.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= list.length) return;
      const next = list.slice();
      const [it] = next.splice(idx, 1);
      next.splice(j, 0, it);
      onChange(next);
    },
    [list, onChange]
  );

  // -------- plotting ------------------------------------------------------
  const plotOne = useCallback(() => {
    if (!active) return;
    const doc = plotSheetsToPdf({ unit, layers, entities, drawingName }, [active]);
    if (doc) doc.save(`${drawingName || 'sheet'}-${active.number}.pdf`);
  }, [active, unit, layers, entities, drawingName]);

  const plotAll = useCallback(() => {
    const doc = plotSheetsToPdf({ unit, layers, entities, drawingName }, list);
    if (doc) doc.save(`${drawingName || 'plan-set'}.pdf`);
  }, [list, unit, layers, entities, drawingName]);

  // -------- preview box sizing --------------------------------------------
  const boxRef = useRef(null);
  const [box, setBox] = useState({ w: 700, h: 500 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth || 700, h: el.clientHeight || 500 });
    update();
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(el);
    }
    window.addEventListener('resize', update);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // -------- preview geometry ----------------------------------------------
  const layout = active ? sheetLayout(active) : null;
  const page = layout ? layout.page : { w: 1, h: 1 };
  const pad = 24; // px breathing room inside the preview box
  const k = layout ? Math.max(0.0001, Math.min((box.w - pad * 2) / page.w, (box.h - pad * 2) / page.h)) : 1; // px per inch
  const pw = page.w * k;
  const ph = page.h * k;
  const ox = (box.w - pw) / 2;
  const oy = (box.h - ph) / 2;
  const clipId = `sheet-area-${active ? active.id : 'none'}`;

  // -------- pan (drag inside drawing area) --------------------------------
  const dragRef = useRef(null);
  const onPanDown = useCallback(
    (e) => {
      if (!active) return;
      dragRef.current = { x: e.clientX, y: e.clientY, cx: active.view.cx || 0, cy: active.view.cy || 0 };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [active]
  );
  const onPanMove = useCallback(
    (e) => {
      const d = dragRef.current;
      if (!d || !active) return;
      const scale = active.view.scale || 0.0001;
      const dxPx = e.clientX - d.x;
      const dyPx = e.clientY - d.y;
      const dwx = -dxPx / (k * scale);
      const dwy = -dyPx / (k * scale);
      patchView({ cx: d.cx + dwx, cy: d.cy + dwy });
    },
    [active, k, patchView]
  );
  const onPanUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // world point → preview px
  const toPx = useCallback(
    (p) => {
      const pp = worldToPaper(active, layout, p);
      return { x: pp.x * k, y: pp.y * k };
    },
    [active, layout, k]
  );

  const renderGeometry = () => {
    if (!active || !layout) return null;
    const scale = active.view.scale || 0.0001;
    const out = [];
    for (const e of entities || []) {
      const lyr = layers.find((l) => l.id === e.layer);
      if (lyr && lyr.visible === false) continue; // skip hidden layers
      const color = e.props?.stroke || lyr?.color || '#111827';
      const P = (e.points || []).map(toPx);
      const common = { stroke: color, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' };
      switch (e.type) {
        case 'line':
          if (P.length >= 2) out.push(<line key={e.id} x1={P[0].x} y1={P[0].y} x2={P[1].x} y2={P[1].y} {...common} />);
          break;
        case 'polyline':
          out.push(<polyline key={e.id} points={P.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" strokeLinejoin="round" {...common} />);
          break;
        case 'rect':
        case 'polygon':
          out.push(<polygon key={e.id} points={P.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" strokeLinejoin="round" {...common} />);
          break;
        case 'circle': {
          if (!P[0]) break;
          const r = (e.props?.radius || 0) * scale * k;
          if (r > 0) out.push(<circle key={e.id} cx={P[0].x} cy={P[0].y} r={r} fill="none" {...common} />);
          break;
        }
        case 'text': {
          if (!P[0]) break;
          const fs = Math.max(4, Math.min(200, (e.props?.fontSize || 1) * scale * k));
          out.push(
            <text key={e.id} x={P[0].x} y={P[0].y} fill={color} fontSize={fs} fontFamily="sans-serif" style={{ userSelect: 'none' }}>
              {String(e.props?.text || '')}
            </text>
          );
          break;
        }
        case 'block': {
          if (!P[0]) break;
          const r = ((e.props?.size || 2) / 2) * scale * k;
          const fs = Math.max(4, Math.min(120, (e.props?.size || 2) * 0.35 * scale * k));
          out.push(
            <g key={e.id}>
              {r > 0 && <circle cx={P[0].x} cy={P[0].y} r={r} fill="none" {...common} />}
              {e.props?.label ? (
                <text x={P[0].x} y={P[0].y + r + fs} fill={color} fontSize={fs} textAnchor="middle" fontFamily="sans-serif" style={{ userSelect: 'none' }}>
                  {e.props.label}
                </text>
              ) : null}
            </g>
          );
          break;
        }
        default:
          break;
      }
    }
    return out;
  };

  const renderTitleBlock = () => {
    if (!active || !layout) return null;
    const tb = layout.tb;
    const lines = tbLines(active, drawingName);
    const tx = (tb.x + 0.15) * k;
    let ty = (tb.y + 0.35) * k;
    const step = 0.55 * k;
    const labelFs = (6.5 / 72) * k; // 6.5pt → px
    const valueFs = (9 / 72) * k; // 9pt → px
    const nodes = [];
    lines.forEach(([label, value], i) => {
      nodes.push(
        <g key={`tb-${i}`}>
          <text x={tx} y={ty} fill="#787878" fontSize={Math.max(4, labelFs)} fontFamily="sans-serif" style={{ userSelect: 'none' }}>
            {label}
          </text>
          <text x={tx} y={ty + 0.17 * k} fill="#111827" fontSize={Math.max(5, valueFs)} fontFamily="sans-serif" style={{ userSelect: 'none' }}>
            {String(value).slice(0, 34)}
          </text>
          <line x1={tb.x * k} y1={ty + 0.32 * k} x2={(tb.x + tb.w) * k} y2={ty + 0.32 * k} stroke="#d1d5db" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </g>
      );
      ty += step;
    });
    if (active.titleBlock?.notes) {
      nodes.push(
        <g key="tb-notes">
          <text x={tx} y={ty} fill="#787878" fontSize={Math.max(4, labelFs)} fontFamily="sans-serif" style={{ userSelect: 'none' }}>
            NOTES
          </text>
          <text x={tx} y={ty + 0.16 * k} fill="#111827" fontSize={Math.max(5, (8 / 72) * k)} fontFamily="sans-serif" style={{ userSelect: 'none' }}>
            {String(active.titleBlock.notes).slice(0, 40)}
          </text>
        </g>
      );
    }
    return nodes;
  };

  const currentScaleValue = active ? String(active.view?.scale ?? '') : '';

  // -------- render --------------------------------------------------------
  return (
    <div className="flex flex-col h-full w-full bg-gray-50 text-gray-800 select-none" style={{ minHeight: 0 }}>
      {/* ===== Header ===== */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => onExit && onExit()}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
        >
          ← Back
        </button>
        <span className="text-sm font-semibold text-gray-700">Plan Set</span>
        <span className="text-xs text-gray-400">{list.length} sheet{list.length === 1 ? '' : 's'}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={plotOne}
            disabled={!active}
            title="Plot the active sheet to PDF"
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
          >
            ⬇ Plot PDF
          </button>
          <button
            onClick={plotAll}
            disabled={!list.length}
            title="Plot every sheet to a single PDF"
            className="px-3 py-1.5 text-sm rounded-md text-white disabled:opacity-50"
            style={{ backgroundColor: GREEN }}
          >
            ⬇ Plot All
          </button>
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className="flex flex-1 min-h-0">
        {/* --- Left: sheet list --- */}
        <div className="w-56 border-r border-gray-200 bg-white flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sheets</span>
          </div>
          <div className="p-2">
            <button
              onClick={addSheet}
              className="w-full px-2 py-1.5 text-sm rounded-md text-white"
              style={{ backgroundColor: GREEN }}
            >
              + Add Sheet
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {list.length === 0 ? (
              <div className="text-xs text-gray-400 px-3 py-6 text-center">
                No sheets yet. Add a sheet to compose your plan set.
              </div>
            ) : (
              list.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer border-l-2 ${
                    active && active.id === s.id ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}
                  style={{ borderLeftColor: active && active.id === s.id ? GREEN : 'transparent' }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-700 truncate">{s.number}</div>
                    <div className="text-[11px] text-gray-400 truncate">{s.name}</div>
                  </div>
                  <button
                    title="Move up"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSheet(s.id, -1);
                    }}
                    disabled={i === 0}
                    className="w-5 h-5 flex items-center justify-center text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    title="Move down"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSheet(s.id, 1);
                    }}
                    disabled={i === list.length - 1}
                    className="w-5 h-5 flex items-center justify-center text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  >
                    ▼
                  </button>
                  <button
                    title="Delete sheet"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete sheet ${s.number}?`)) deleteSheet(s.id);
                    }}
                    className="w-5 h-5 flex items-center justify-center text-xs text-gray-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- Center: preview --- */}
        <div ref={boxRef} className="flex-1 relative overflow-hidden bg-gray-100" style={{ minWidth: 0 }}>
          {!active ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
              Add a sheet to see the preview.
            </div>
          ) : (
            <svg width={box.w} height={box.h} style={{ display: 'block' }}>
              <defs>
                <clipPath id={clipId}>
                  <rect x={layout.area.x * k} y={layout.area.y * k} width={layout.area.w * k} height={layout.area.h * k} />
                </clipPath>
              </defs>
              <g transform={`translate(${ox},${oy})`}>
                {/* page */}
                <rect x={0} y={0} width={pw} height={ph} fill="#ffffff" stroke="#9ca3af" strokeWidth={1} />
                {/* geometry (clipped to drawing area) */}
                <g clipPath={`url(#${clipId})`}>{renderGeometry()}</g>
                {/* border */}
                <rect
                  x={layout.border.x * k}
                  y={layout.border.y * k}
                  width={layout.border.w * k}
                  height={layout.border.h * k}
                  fill="none"
                  stroke="#111827"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
                {/* title block */}
                <rect
                  x={layout.tb.x * k}
                  y={layout.tb.y * k}
                  width={layout.tb.w * k}
                  height={layout.tb.h * k}
                  fill="#ffffff"
                  stroke="#111827"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                {renderTitleBlock()}
                {/* pan surface over the drawing area */}
                <rect
                  x={layout.area.x * k}
                  y={layout.area.y * k}
                  width={layout.area.w * k}
                  height={layout.area.h * k}
                  fill="transparent"
                  style={{ cursor: 'grab', touchAction: 'none' }}
                  onPointerDown={onPanDown}
                  onPointerMove={onPanMove}
                  onPointerUp={onPanUp}
                />
              </g>
            </svg>
          )}
          {active && (
            <div className="absolute bottom-2 left-2 text-[11px] bg-white/90 border border-gray-200 rounded px-2 py-1 text-gray-500 shadow-sm">
              Drag to pan · {scaleLabel(active.view?.scale || 0)}
            </div>
          )}
        </div>

        {/* --- Right: properties --- */}
        <div className="w-64 border-l border-gray-200 bg-white flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sheet Properties</span>
          </div>
          <div className="flex-1 overflow-auto p-3 text-xs space-y-3">
            {!active ? (
              <div className="text-gray-400">No sheet selected.</div>
            ) : (
              <>
                <label className="block">
                  <span className="text-gray-500 block mb-1">Sheet number</span>
                  <input
                    value={active.number || ''}
                    onChange={(e) => patchActive({ number: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-500 block mb-1">Sheet name</span>
                  <input
                    value={active.name || ''}
                    onChange={(e) => patchActive({ name: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1"
                  />
                </label>

                <label className="block">
                  <span className="text-gray-500 block mb-1">Paper size</span>
                  <select
                    value={active.size}
                    onChange={(e) => patchActive({ size: e.target.value })}
                    className="w-full border border-gray-300 rounded px-1 py-1"
                  >
                    {Object.keys(PAPER_SIZES).map((key) => (
                      <option key={key} value={key}>
                        {PAPER_SIZES[key].label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="block">
                  <span className="text-gray-500 block mb-1">Orientation</span>
                  <div className="flex gap-1">
                    {['landscape', 'portrait'].map((o) => (
                      <button
                        key={o}
                        onClick={() => patchActive({ orientation: o })}
                        className="flex-1 px-2 py-1 rounded border capitalize"
                        style={
                          active.orientation === o
                            ? { backgroundColor: GREEN, color: '#fff', borderColor: GREEN }
                            : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#374151' }
                        }
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="block">
                  <span className="text-gray-500 block mb-1">Scale</span>
                  <div className="flex gap-1">
                    <select
                      value={currentScaleValue}
                      onChange={(e) => patchView({ scale: parseFloat(e.target.value) })}
                      className="flex-1 border border-gray-300 rounded px-1 py-1"
                    >
                      {!SCALE_PRESETS.some((p) => Math.abs(p.inPerFt - (active.view?.scale || 0)) < 1e-6) && (
                        <option value={currentScaleValue}>{scaleLabel(active.view?.scale || 0)}</option>
                      )}
                      {SCALE_PRESETS.map((p) => (
                        <option key={p.label} value={p.inPerFt}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => patchView(fitView(entities, active))}
                      title="Fit the model to the drawing area"
                      className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
                    >
                      Fit
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Title Block</div>
                  <label className="block mb-2">
                    <span className="text-gray-500 block mb-1">Project</span>
                    <input
                      value={active.titleBlock?.project || ''}
                      onChange={(e) => patchTB({ project: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </label>
                  <label className="block mb-2">
                    <span className="text-gray-500 block mb-1">Client</span>
                    <input
                      value={active.titleBlock?.client || ''}
                      onChange={(e) => patchTB({ client: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </label>
                  <label className="block mb-2">
                    <span className="text-gray-500 block mb-1">Address</span>
                    <input
                      value={active.titleBlock?.address || ''}
                      onChange={(e) => patchTB({ address: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </label>
                  <label className="block mb-2">
                    <span className="text-gray-500 block mb-1">Drawn by</span>
                    <input
                      value={active.titleBlock?.drawnBy || ''}
                      onChange={(e) => patchTB({ drawnBy: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </label>
                  <label className="block mb-2">
                    <span className="text-gray-500 block mb-1">Date</span>
                    <input
                      type="date"
                      value={active.titleBlock?.date || ''}
                      onChange={(e) => patchTB({ date: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </label>
                  <label className="block mb-2">
                    <span className="text-gray-500 block mb-1">Revision</span>
                    <input
                      value={active.titleBlock?.revision || ''}
                      onChange={(e) => patchTB({ revision: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-500 block mb-1">Notes</span>
                    <textarea
                      value={active.titleBlock?.notes || ''}
                      onChange={(e) => patchTB({ notes: e.target.value })}
                      rows={3}
                      className="w-full border border-gray-300 rounded px-2 py-1 resize-y"
                    />
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
