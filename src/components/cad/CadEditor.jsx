/*
 * CadEditor.jsx — Phase 1 in-browser 2D CAD drafting surface
 * ----------------------------------------------------------
 * A from-scratch vector drawing canvas for landscaping plan sets.
 *
 * Coordinate model:
 *   - All entity coordinates are stored in WORLD units (feet by default).
 *   - The SVG uses ONE <g transform="translate(panX,panY) scale(zoom)"> so
 *     everything inside is authored in world units. `zoom` = pixels per world unit.
 *   - world -> screen : world * zoom + pan
 *   - screen -> world : (screen - pan) / zoom
 *   - Strokes use vectorEffect="non-scaling-stroke" so stroke-width is in screen px
 *     and stays a constant on-screen thickness regardless of zoom.
 *
 * Tools: select, pan(hand), line, polyline, rect, circle, polygon, text.
 * Features: layers panel, properties panel, snap-to-grid, wheel-zoom-to-cursor,
 *   space/middle-drag pan, zoom fit, undo/redo history, measurement readouts,
 *   Supabase persistence (cad_drawings), dirty tracking, Ctrl+S / Ctrl+Z shortcuts.
 *
 * Contract: <CadEditor drawing={row} onBack={fn} onSaved={fn} />
 *   - drawing.data may be {} on a new drawing (seeded on load).
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { entitiesToDxf, parseDxf } from './dxf';

// ---- constants -----------------------------------------------------------
const ZOOM_MIN = 2;
const ZOOM_MAX = 400;
const HISTORY_CAP = 50;
const GREEN = '#3A5038';

const DEFAULT_DATA = () => ({
  unit: 'ft',
  gridSpacing: 1,
  layers: [{ id: 'layer-0', name: 'Layer 0', color: '#111827', visible: true, locked: false }],
  entities: [],
  view: { zoom: 20, panX: 60, panY: 60 },
});

const TOOLS = [
  { id: 'select', icon: '↖', label: 'Select' },
  { id: 'pan', icon: '✋', label: 'Pan' },
  { id: 'line', icon: '／', label: 'Line' },
  { id: 'polyline', icon: '⸿', label: 'Polyline' },
  { id: 'rect', icon: '▭', label: 'Rectangle' },
  { id: 'circle', icon: '◯', label: 'Circle' },
  { id: 'polygon', icon: '⬡', label: 'Polygon' },
  { id: 'text', icon: 'T', label: 'Text' },
];

// ---- id helper -----------------------------------------------------------
let _idc = 0;
const uid = (p = 'e') => `${p}-${Date.now().toString(36)}-${(_idc++).toString(36)}`;

// ---- category -> deterministic pleasant color ----------------------------
function categoryColor(cat) {
  if (!cat) return '#9ca3af'; // gray-400 default
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 52%, 55%)`;
}

// ---- geometry helpers ----------------------------------------------------
function polylineLength(points) {
  if (!points || points.length < 2) return 0;
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return d;
}
// Shoelace area (absolute) for a closed polygon
function polygonArea(points) {
  if (!points || points.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}
function polygonPerimeter(points) {
  if (!points || points.length < 2) return 0;
  let d = polylineLength(points);
  const p = points[0];
  const q = points[points.length - 1];
  d += Math.hypot(q.x - p.x, q.y - p.y); // closing edge
  return d;
}

export default function CadEditor({ drawing, onBack, onSaved }) {
  // -------- initial data (seed if empty) ----------------------------------
  const initial = useMemo(() => {
    const d = drawing && drawing.data && typeof drawing.data === 'object' ? drawing.data : {};
    const base = DEFAULT_DATA();
    return {
      unit: d.unit || base.unit,
      gridSpacing: typeof d.gridSpacing === 'number' && d.gridSpacing > 0 ? d.gridSpacing : base.gridSpacing,
      layers: Array.isArray(d.layers) && d.layers.length ? d.layers : base.layers,
      entities: Array.isArray(d.entities) ? d.entities : base.entities,
      view: d.view && typeof d.view === 'object' ? { ...base.view, ...d.view } : base.view,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing && drawing.id]);

  // -------- core drawing state --------------------------------------------
  const [unit, setUnit] = useState(initial.unit);
  const [gridSpacing, setGridSpacing] = useState(initial.gridSpacing);
  const [layers, setLayers] = useState(initial.layers);
  const [entities, setEntities] = useState(initial.entities);
  const [activeLayer, setActiveLayer] = useState(initial.layers[0].id);

  // view (zoom + pan)
  const [zoom, setZoom] = useState(initial.view.zoom);
  const [pan, setPan] = useState({ x: initial.view.panX, y: initial.view.panY });

  // tool + interaction
  const [tool, setTool] = useState('select');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [snap, setSnap] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  // in-progress drawing state
  const [draft, setDraft] = useState(null); // { type, points:[], props }
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [showLayers, setShowLayers] = useState(true);
  const [showProps, setShowProps] = useState(true);

  // selections library (place-as-block)
  const [selections, setSelections] = useState([]);
  const [showSelections, setShowSelections] = useState(false);
  const [placingSelection, setPlacingSelection] = useState(null);
  const [selSearch, setSelSearch] = useState('');
  const [selCatFilter, setSelCatFilter] = useState('All');

  // takeoff panel (Phase 3 — read-only aggregation)
  const [showTakeoff, setShowTakeoff] = useState(false);
  const [takeoffVisibleOnly, setTakeoffVisibleOnly] = useState(false);
  const [takeoffCopied, setTakeoffCopied] = useState(false);

  // header / persistence
  const [name, setName] = useState(drawing ? drawing.name || 'Untitled' : 'Untitled');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);

  // DXF import transient notice (short-lived status string)
  const [importNotice, setImportNotice] = useState('');
  const dxfFileRef = useRef(null);

  // text inline editor
  const [textEdit, setTextEdit] = useState(null); // { x, y, value, id? }

  // rename inline for layers
  const [renamingLayer, setRenamingLayer] = useState(null);

  // -------- refs ----------------------------------------------------------
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const spaceDown = useRef(false);
  const panDrag = useRef(null); // { startX, startY, panX, panY }
  const moveDrag = useRef(null); // { id, startWorld }
  const historyRef = useRef({ past: [], future: [] });
  const skipHistory = useRef(false);

  // -------- resize awareness ---------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth || 800, h: el.clientHeight || 600 });
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

  // -------- load selections library (once) --------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('selections')
          .select('id, category, sub_category, name, photo_url, price, unit, material_rate_id')
          .order('category')
          .order('name');
        if (cancelled) return;
        if (error) {
          // eslint-disable-next-line no-console
          console.error('CAD selections load failed', error);
          setSelections([]);
          return;
        }
        setSelections(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error('CAD selections load failed', err);
        setSelections([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // distinct category list for the palette filter
  const selectionCategories = useMemo(() => {
    const set = new Set();
    selections.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set).sort();
  }, [selections]);

  // filtered selections for the palette
  const filteredSelections = useMemo(() => {
    const q = selSearch.trim().toLowerCase();
    return selections.filter((s) => {
      if (selCatFilter !== 'All' && (s.category || '') !== selCatFilter) return false;
      if (!q) return true;
      const hay = `${s.name || ''} ${s.category || ''} ${s.sub_category || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [selections, selSearch, selCatFilter]);

  // -------- history -------------------------------------------------------
  const snapshot = useCallback(() => {
    if (skipHistory.current) return;
    const h = historyRef.current;
    h.past.push({ layers: JSON.parse(JSON.stringify(layers)), entities: JSON.parse(JSON.stringify(entities)) });
    if (h.past.length > HISTORY_CAP) h.past.shift();
    h.future = [];
  }, [layers, entities]);

  const markDirty = useCallback(() => {
    setDirty(true);
    setSavedAt(false);
  }, []);

  // Wrap edits: push current state to history, then apply, then mark dirty.
  const commit = useCallback(
    (fn) => {
      snapshot();
      fn();
      markDirty();
    },
    [snapshot, markDirty]
  );

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (!h.past.length) return;
    const prev = h.past.pop();
    h.future.push({ layers: JSON.parse(JSON.stringify(layers)), entities: JSON.parse(JSON.stringify(entities)) });
    skipHistory.current = true;
    setLayers(prev.layers);
    setEntities(prev.entities);
    setTimeout(() => (skipHistory.current = false), 0);
    markDirty();
  }, [layers, entities, markDirty]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (!h.future.length) return;
    const next = h.future.pop();
    h.past.push({ layers: JSON.parse(JSON.stringify(layers)), entities: JSON.parse(JSON.stringify(entities)) });
    skipHistory.current = true;
    setLayers(next.layers);
    setEntities(next.entities);
    setTimeout(() => (skipHistory.current = false), 0);
    markDirty();
  }, [layers, entities, markDirty]);

  // -------- coordinate helpers -------------------------------------------
  const toWorld = useCallback(
    (clientX, clientY) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const r = svg.getBoundingClientRect();
      const sx = clientX - r.left;
      const sy = clientY - r.top;
      return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom };
    },
    [pan, zoom]
  );

  const snapWorld = useCallback(
    (p) => {
      if (!snap || !gridSpacing) return p;
      return {
        x: Math.round(p.x / gridSpacing) * gridSpacing,
        y: Math.round(p.y / gridSpacing) * gridSpacing,
      };
    },
    [snap, gridSpacing]
  );

  // -------- layer helpers -------------------------------------------------
  const layerById = useCallback((id) => layers.find((l) => l.id === id), [layers]);
  const activeLayerObj = layerById(activeLayer) || layers[0];

  // Visible & not-locked entities are hit-testable.
  const isEntityInteractable = useCallback(
    (ent) => {
      const l = layerById(ent.layer);
      return l && l.visible && !l.locked;
    },
    [layerById]
  );

  // -------- unit / measurement formatting --------------------------------
  const lenUnit = unit; // ft / in / m
  const areaLabel = unit === 'ft' ? 'SF' : `${unit}²`;
  const fmtLen = (v) => `${v.toFixed(1)} ${lenUnit}`;
  const fmtArea = (v) => `${v.toFixed(1)} ${areaLabel}`;
  const fmtLF = (v) => `${v.toFixed(1)} LF`; // linear takeoff label
  const fmtMoney = (v) =>
    `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // -------- selection ------------------------------------------------------
  const selected = useMemo(() => entities.find((e) => e.id === selectedId) || null, [entities, selectedId]);

  const measurementOf = useCallback(
    (ent) => {
      if (!ent) return '';
      if (ent.type === 'line' || ent.type === 'polyline') {
        return `Length ${fmtLen(polylineLength(ent.points))}`;
      }
      if (ent.type === 'rect' || ent.type === 'polygon') {
        return `Area ${fmtArea(polygonArea(ent.points))} · Perim ${fmtLen(polygonPerimeter(ent.points))}`;
      }
      if (ent.type === 'circle') {
        const r = ent.props?.radius || 0;
        return `R ${fmtLen(r)} · Area ${fmtArea(Math.PI * r * r)}`;
      }
      if (ent.type === 'text') return `Text "${ent.props?.text || ''}"`;
      return '';
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [unit]
  );

  // live measurement while drawing
  const draftMeasurement = useMemo(() => {
    if (!draft) return '';
    const pts = [...draft.points];
    if (draft.type === 'line' || draft.type === 'polyline') {
      pts.push(cursor);
      return `Length ${fmtLen(polylineLength(pts))}`;
    }
    if (draft.type === 'rect') {
      if (draft.points.length === 1) {
        const a = draft.points[0];
        const w = Math.abs(cursor.x - a.x);
        const h = Math.abs(cursor.y - a.y);
        return `${fmtLen(w)} × ${fmtLen(h)} · ${fmtArea(w * h)}`;
      }
    }
    if (draft.type === 'polygon') {
      pts.push(cursor);
      if (pts.length >= 3) return `Area ${fmtArea(polygonArea(pts))} · Perim ${fmtLen(polygonPerimeter(pts))}`;
      return `Length ${fmtLen(polylineLength(pts))}`;
    }
    if (draft.type === 'circle' && draft.points.length === 1) {
      const c = draft.points[0];
      const r = Math.hypot(cursor.x - c.x, cursor.y - c.y);
      return `R ${fmtLen(r)} · Area ${fmtArea(Math.PI * r * r)}`;
    }
    return '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, cursor, unit]);

  // -------- takeoff aggregation (Phase 3, read-only) ----------------------
  const takeoff = useMemo(() => {
    const layerName = (id) => {
      const l = layers.find((x) => x.id === id);
      return l ? l.name : id || '—';
    };
    const layerVisible = (id) => {
      const l = layers.find((x) => x.id === id);
      return l ? l.visible !== false : true;
    };
    const src = entities.filter((e) => {
      if (!e || e.type === 'text') return false; // ignore text
      if (takeoffVisibleOnly && !layerVisible(e.layer)) return false;
      return true;
    });

    // A) Selections (blocks) grouped by selectionId
    const blockMap = new Map();
    src
      .filter((e) => e.type === 'block')
      .forEach((e) => {
        const p = e.props || {};
        const key = p.selectionId || e.id;
        let row = blockMap.get(key);
        if (!row) {
          const priceNum =
            p.price != null && p.price !== '' && !Number.isNaN(Number(p.price)) ? Number(p.price) : null;
          row = {
            key,
            label: p.label || 'Block',
            category: p.category || '',
            unit: p.unit || '',
            price: priceNum,
            photoUrl: p.photoUrl || '',
            qty: 0,
          };
          blockMap.set(key, row);
        }
        row.qty += 1;
      });
    const blockRows = Array.from(blockMap.values()).map((r) => ({
      ...r,
      extended: r.price != null ? r.qty * r.price : null,
    }));
    blockRows.sort((a, b) => {
      const c = (a.category || '').localeCompare(b.category || '');
      if (c !== 0) return c;
      return (a.label || '').localeCompare(b.label || '');
    });
    const blockTotalQty = blockRows.reduce((s, r) => s + r.qty, 0);
    const blockTotalCost = blockRows.reduce((s, r) => s + (r.extended != null ? r.extended : 0), 0);
    const catCountMap = {};
    blockRows.forEach((r) => {
      const c = r.category || 'Uncategorized';
      catCountMap[c] = (catCountMap[c] || 0) + r.qty;
    });
    const categorySummary = Object.keys(catCountMap)
      .sort()
      .map((c) => ({ category: c, qty: catCountMap[c] }));

    // B) Areas: rect, polygon, circle grouped by layer
    const areaMap = new Map();
    src
      .filter((e) => e.type === 'rect' || e.type === 'polygon' || e.type === 'circle')
      .forEach((e) => {
        let row = areaMap.get(e.layer);
        if (!row) {
          row = { layer: e.layer, name: layerName(e.layer), count: 0, area: 0, perim: 0 };
          areaMap.set(e.layer, row);
        }
        row.count += 1;
        if (e.type === 'circle') {
          const r = (e.props && e.props.radius) || 0;
          row.area += Math.PI * r * r;
          row.perim += 2 * Math.PI * r;
        } else {
          row.area += polygonArea(e.points);
          row.perim += polygonPerimeter(e.points);
        }
      });
    const areaRows = Array.from(areaMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const areaTotal = areaRows.reduce((s, r) => s + r.area, 0);
    const areaPerimTotal = areaRows.reduce((s, r) => s + r.perim, 0);

    // C) Linear: line, polyline grouped by layer
    const linMap = new Map();
    src
      .filter((e) => e.type === 'line' || e.type === 'polyline')
      .forEach((e) => {
        let row = linMap.get(e.layer);
        if (!row) {
          row = { layer: e.layer, name: layerName(e.layer), count: 0, length: 0 };
          linMap.set(e.layer, row);
        }
        row.count += 1;
        row.length += polylineLength(e.points);
      });
    const linRows = Array.from(linMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const linTotal = linRows.reduce((s, r) => s + r.length, 0);

    return {
      blockRows,
      blockTotalQty,
      blockTotalCost,
      categorySummary,
      areaRows,
      areaTotal,
      areaPerimTotal,
      linRows,
      linTotal,
    };
  }, [entities, layers, takeoffVisibleOnly]);

  // copy the whole takeoff as CSV to the clipboard (no file download)
  const copyTakeoffCsv = useCallback(() => {
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [['Section', 'Item/Layer', 'Qty', 'Unit', 'Value', 'Unit Price', 'Extended']];
    takeoff.blockRows.forEach((r) => {
      rows.push([
        'Selections',
        r.label + (r.category ? ` (${r.category})` : ''),
        r.qty,
        r.unit || 'ea',
        '',
        r.price != null ? r.price.toFixed(2) : '',
        r.extended != null ? r.extended.toFixed(2) : '',
      ]);
    });
    takeoff.areaRows.forEach((r) => {
      rows.push(['Areas', r.name, r.count, areaLabel, r.area.toFixed(1), '', '']);
    });
    takeoff.linRows.forEach((r) => {
      rows.push(['Linear', r.name, r.count, 'LF', r.length.toFixed(1), '', '']);
    });
    rows.push(['Total', 'Material cost', '', '', '', '', takeoff.blockTotalCost.toFixed(2)]);
    const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
    try {
      const p = navigator.clipboard && navigator.clipboard.writeText(csv);
      if (p && typeof p.then === 'function') {
        p.then(() => {
          setTakeoffCopied(true);
          setTimeout(() => setTakeoffCopied(false), 1500);
        }).catch(() => {});
      } else {
        setTakeoffCopied(true);
        setTimeout(() => setTakeoffCopied(false), 1500);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Takeoff copy failed', err);
    }
  }, [takeoff, areaLabel]);

  // -------- hit testing ---------------------------------------------------
  const hitTest = useCallback(
    (wp) => {
      const tol = 8 / zoom; // 8px tolerance in world units
      // iterate top-most first
      for (let i = entities.length - 1; i >= 0; i--) {
        const ent = entities[i];
        if (!isEntityInteractable(ent)) continue;
        if (ent.type === 'circle') {
          const c = ent.points[0];
          const r = ent.props?.radius || 0;
          const d = Math.hypot(wp.x - c.x, wp.y - c.y);
          if (Math.abs(d - r) <= tol || d <= r) return ent;
        } else if (ent.type === 'text') {
          const p = ent.points[0];
          const fs = ent.props?.fontSize || 1;
          if (wp.x >= p.x - tol && wp.x <= p.x + fs * 8 && wp.y >= p.y - fs && wp.y <= p.y + tol) return ent;
        } else if (ent.type === 'block') {
          const c = ent.points[0];
          const half = (ent.props?.size || 2) / 2;
          const d = Math.hypot(wp.x - c.x, wp.y - c.y);
          if (
            (wp.x >= c.x - half - tol && wp.x <= c.x + half + tol && wp.y >= c.y - half - tol && wp.y <= c.y + half + tol) ||
            d <= half + tol
          )
            return ent;
        } else if (ent.type === 'rect' || ent.type === 'polygon') {
          if (pointInPoly(wp, ent.points) || nearAnySegment(wp, ent.points, tol, true)) return ent;
        } else {
          // line / polyline
          if (nearAnySegment(wp, ent.points, tol, false)) return ent;
        }
      }
      return null;
    },
    [entities, zoom, isEntityInteractable]
  );

  // place a Selection from the library as a 'block' entity
  const placeBlock = useCallback(
    (sel, wp) => {
      if (!sel) return;
      const stroke = activeLayerObj ? activeLayerObj.color : '#111827';
      const ent = {
        id: uid('block'),
        type: 'block',
        layer: activeLayer,
        points: [{ x: wp.x, y: wp.y }],
        props: {
          selectionId: sel.id,
          label: sel.name || '',
          category: sel.category || '',
          subCategory: sel.sub_category || '',
          photoUrl: sel.photo_url || '',
          price: sel.price ?? null,
          unit: sel.unit || '',
          materialRateId: sel.material_rate_id || null,
          size: 2,
          color: categoryColor(sel.category || ''),
          stroke,
          width: 2,
        },
      };
      commit(() => setEntities((prev) => [...prev, ent]));
      setSelectedId(ent.id);
    },
    [activeLayer, activeLayerObj, commit]
  );

  // choose a selection card -> enter place mode
  const chooseSelection = useCallback((sel) => {
    setPlacingSelection(sel);
    setTool('place');
    setDraft(null);
    setSelectedId(null);
  }, []);

  // leave place mode
  const stopPlacing = useCallback(() => {
    setPlacingSelection(null);
    setTool('select');
  }, []);

  // -------- pointer handlers ---------------------------------------------
  const onSvgPointerDown = useCallback(
    (e) => {
      if (textEdit) return; // let inline input handle
      const isMiddle = e.button === 1;
      const startPan = isMiddle || (spaceDown.current && e.button === 0) || tool === 'pan';
      if (startPan) {
        panDrag.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
        e.preventDefault();
        return;
      }
      if (e.button !== 0) return;
      const raw = toWorld(e.clientX, e.clientY);
      const wp = snapWorld(raw);

      if (tool === 'select') {
        const hit = hitTest(raw);
        if (hit) {
          setSelectedId(hit.id);
          moveDrag.current = { id: hit.id, startWorld: raw, moved: false, orig: hit.points.map((p) => ({ ...p })) };
        } else {
          setSelectedId(null);
        }
        return;
      }

      if (tool === 'place') {
        if (placingSelection) placeBlock(placingSelection, wp);
        return;
      }

      if (tool === 'text') {
        setTextEdit({ x: wp.x, y: wp.y, value: '', id: null });
        return;
      }

      if (tool === 'line') {
        if (!draft) setDraft({ type: 'line', points: [wp] });
        else {
          finalizeEntity('line', [draft.points[0], wp], {});
          setDraft(null);
        }
        return;
      }
      if (tool === 'rect') {
        if (!draft) setDraft({ type: 'rect', points: [wp] });
        else {
          const a = draft.points[0];
          const b = wp;
          const pts = [
            { x: a.x, y: a.y },
            { x: b.x, y: a.y },
            { x: b.x, y: b.y },
            { x: a.x, y: b.y },
          ];
          finalizeEntity('rect', pts, {});
          setDraft(null);
        }
        return;
      }
      if (tool === 'circle') {
        if (!draft) setDraft({ type: 'circle', points: [wp] });
        else {
          const c = draft.points[0];
          const r = Math.hypot(wp.x - c.x, wp.y - c.y);
          finalizeEntity('circle', [c], { radius: r });
          setDraft(null);
        }
        return;
      }
      if (tool === 'polyline' || tool === 'polygon') {
        if (!draft) setDraft({ type: tool, points: [wp] });
        else setDraft({ ...draft, points: [...draft.points, wp] });
        return;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, draft, pan, toWorld, snapWorld, hitTest, textEdit, placingSelection, placeBlock]
  );

  const onSvgPointerMove = useCallback(
    (e) => {
      const raw = toWorld(e.clientX, e.clientY);
      setCursor(snapWorld(raw));

      if (panDrag.current) {
        const d = panDrag.current;
        setPan({ x: d.panX + (e.clientX - d.startX), y: d.panY + (e.clientY - d.startY) });
        return;
      }
      if (moveDrag.current) {
        const md = moveDrag.current;
        const dx = raw.x - md.startWorld.x;
        const dy = raw.y - md.startWorld.y;
        if (!md.moved) {
          md.moved = true;
          snapshot(); // record once at drag start
        }
        setEntities((prev) =>
          prev.map((ent) =>
            ent.id === md.id ? { ...ent, points: md.orig.map((p) => ({ x: p.x + dx, y: p.y + dy })) } : ent
          )
        );
        return;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toWorld, snapWorld, snapshot]
  );

  const onSvgPointerUp = useCallback(() => {
    panDrag.current = null;
    if (moveDrag.current) {
      if (moveDrag.current.moved) markDirty();
      moveDrag.current = null;
    }
  }, [markDirty]);

  const onSvgDoubleClick = useCallback(() => {
    if (draft && (draft.type === 'polyline' || draft.type === 'polygon')) {
      finishPolyDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // create an entity on the active layer
  const finalizeEntity = useCallback(
    (type, points, extraProps) => {
      const stroke = activeLayerObj ? activeLayerObj.color : '#111827';
      const closed = type === 'rect' || type === 'polygon';
      const ent = {
        id: uid(type),
        type,
        layer: activeLayer,
        points,
        props: {
          stroke,
          width: strokeWidth,
          fill: closed ? 'none' : 'none',
          ...extraProps,
        },
      };
      commit(() => setEntities((prev) => [...prev, ent]));
      setSelectedId(ent.id);
    },
    [activeLayer, activeLayerObj, strokeWidth, commit]
  );

  const finishPolyDraft = useCallback(() => {
    if (!draft) return;
    const min = draft.type === 'polygon' ? 3 : 2;
    if (draft.points.length >= min) {
      finalizeEntity(draft.type, draft.points, {});
    }
    setDraft(null);
  }, [draft, finalizeEntity]);

  // -------- wheel zoom (toward cursor) -----------------------------------
  const onWheel = useCallback(
    (e) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom * factor));
      if (newZoom === zoom) return;
      // world point under cursor stays fixed
      const wx = (sx - pan.x) / zoom;
      const wy = (sy - pan.y) / zoom;
      setPan({ x: sx - wx * newZoom, y: sy - wy * newZoom });
      setZoom(newZoom);
    },
    [zoom, pan]
  );

  // attach wheel with passive:false so preventDefault works
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const zoomBy = (factor) => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom * factor));
    const wx = (cx - pan.x) / zoom;
    const wy = (cy - pan.y) / zoom;
    setPan({ x: cx - wx * newZoom, y: cy - wy * newZoom });
    setZoom(newZoom);
  };

  const zoomFit = useCallback(() => {
    // gather all points
    const pts = [];
    entities.forEach((ent) => {
      if (ent.type === 'circle') {
        const c = ent.points[0];
        const r = ent.props?.radius || 0;
        pts.push({ x: c.x - r, y: c.y - r }, { x: c.x + r, y: c.y + r });
      } else {
        ent.points.forEach((p) => pts.push(p));
      }
    });
    if (!pts.length) {
      setZoom(20);
      setPan({ x: 60, y: 60 });
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    pts.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    const bw = Math.max(maxX - minX, 1);
    const bh = Math.max(maxY - minY, 1);
    const pad = 40;
    const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min((size.w - pad * 2) / bw, (size.h - pad * 2) / bh)));
    setZoom(z);
    setPan({ x: pad - minX * z, y: pad - minY * z });
  }, [entities, size]);

  // -------- keyboard ------------------------------------------------------
  useEffect(() => {
    const kd = (e) => {
      // ignore when typing in inputs
      const tag = (e.target && e.target.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
      if (e.code === 'Space' && !typing) {
        spaceDown.current = true;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        save();
        return;
      }
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }
      if (typing) return;
      if (e.key === 'Escape') {
        setDraft(null);
        setTextEdit(null);
        if (placingSelection) {
          setPlacingSelection(null);
          setTool('select');
        }
      }
      if (e.key === 'Enter' && draft && (draft.type === 'polyline' || draft.type === 'polygon')) {
        finishPolyDraft();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        deleteSelected();
      }
      // tool shortcuts
      if (!mod) {
        const map = { v: 'select', h: 'pan', l: 'line', p: 'polyline', r: 'rect', c: 'circle', g: 'polygon', t: 'text' };
        if (map[e.key]) setTool(map[e.key]);
      }
    };
    const ku = (e) => {
      if (e.code === 'Space') spaceDown.current = false;
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, selectedId, undo, redo, finishPolyDraft, placingSelection]);

  // -------- entity mutation helpers --------------------------------------
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    commit(() => setEntities((prev) => prev.filter((e) => e.id !== selectedId)));
    setSelectedId(null);
  }, [selectedId, commit]);

  const updateSelectedProps = useCallback(
    (patch) => {
      if (!selectedId) return;
      commit(() =>
        setEntities((prev) =>
          prev.map((e) => (e.id === selectedId ? { ...e, props: { ...e.props, ...patch } } : e))
        )
      );
    },
    [selectedId, commit]
  );

  const moveSelectedToLayer = useCallback(
    (layerId) => {
      if (!selectedId) return;
      commit(() => setEntities((prev) => prev.map((e) => (e.id === selectedId ? { ...e, layer: layerId } : e))));
    },
    [selectedId, commit]
  );

  // -------- text commit ---------------------------------------------------
  const commitText = useCallback(() => {
    if (!textEdit) return;
    const val = textEdit.value.trim();
    if (textEdit.id) {
      // editing existing
      if (val) {
        commit(() =>
          setEntities((prev) =>
            prev.map((e) => (e.id === textEdit.id ? { ...e, props: { ...e.props, text: val } } : e))
          )
        );
      }
    } else if (val) {
      const stroke = activeLayerObj ? activeLayerObj.color : '#111827';
      const ent = {
        id: uid('text'),
        type: 'text',
        layer: activeLayer,
        points: [{ x: textEdit.x, y: textEdit.y }],
        props: { stroke, width: strokeWidth, fill: 'none', text: val, fontSize: 1.0 },
      };
      commit(() => setEntities((prev) => [...prev, ent]));
      setSelectedId(ent.id);
    }
    setTextEdit(null);
  }, [textEdit, activeLayer, activeLayerObj, strokeWidth, commit]);

  // -------- layers CRUD ---------------------------------------------------
  const addLayer = () => {
    const id = uid('layer');
    const palette = ['#111827', '#b91c1c', '#1d4ed8', '#047857', '#b45309', '#7c3aed', '#0e7490'];
    const color = palette[layers.length % palette.length];
    commit(() => setLayers((prev) => [...prev, { id, name: `Layer ${prev.length}`, color, visible: true, locked: false }]));
    setActiveLayer(id);
  };
  const deleteLayer = (id) => {
    if (layers.length <= 1) return; // keep at least one
    commit(() => {
      setEntities((prev) => prev.map((e) => (e.layer === id ? { ...e, layer: layers[0].id === id ? layers[1].id : layers[0].id } : e)));
      setLayers((prev) => prev.filter((l) => l.id !== id));
    });
    if (activeLayer === id) setActiveLayer(layers[0].id === id ? layers[1].id : layers[0].id);
  };
  const patchLayer = (id, patch) => {
    commit(() => setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l))));
  };

  // -------- persistence ---------------------------------------------------
  const save = useCallback(async () => {
    if (!drawing || !drawing.id) return;
    setSaving(true);
    const data = {
      unit,
      gridSpacing,
      layers,
      entities,
      view: { zoom, panX: pan.x, panY: pan.y },
    };
    try {
      const { data: row, error } = await supabase
        .from('cad_drawings')
        .update({ data, name })
        .eq('id', drawing.id)
        .select()
        .single();
      if (error) throw error;
      setDirty(false);
      setSavedAt(true);
      if (typeof onSaved === 'function') onSaved?.(row);
    } catch (err) {
      // surface error minimally
      // eslint-disable-next-line no-console
      console.error('CAD save failed', err);
      alert(`Save failed: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  }, [drawing, unit, gridSpacing, layers, entities, zoom, pan, name, onSaved]);

  // -------- DXF export (read-only, no dirty) ------------------------------
  const exportDxf = useCallback(() => {
    try {
      const dxf = entitiesToDxf({ unit, layers, entities });
      const blob = new Blob([dxf], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(drawing?.name || name || 'drawing')}.dxf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('DXF export failed', err);
      alert(`Export failed: ${err.message || err}`);
    }
  }, [unit, layers, entities, drawing, name]);

  // -------- DXF import (merge into current drawing) -----------------------
  const importDxfFile = useCallback(
    async (file) => {
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = parseDxf(text);
        if (!parsed || !Array.isArray(parsed.entities) || parsed.entities.length === 0) {
          setImportNotice('No drawable entities found in that DXF.');
          setTimeout(() => setImportNotice(''), 4000);
          return;
        }

        // Map imported layer ids → existing (by case-insensitive name) or self.
        const nameToExisting = new Map();
        layers.forEach((l) => nameToExisting.set((l.name || '').toLowerCase(), l.id));
        const layerMap = {};
        const newLayers = [];
        (parsed.layers || []).forEach((il) => {
          const key = (il.name || '').toLowerCase();
          if (nameToExisting.has(key)) {
            layerMap[il.id] = nameToExisting.get(key);
          } else {
            layerMap[il.id] = il.id; // keep its id, add as a new layer
            newLayers.push(il);
            nameToExisting.set(key, il.id);
          }
        });

        const fallbackLayer = activeLayer || (layers[0] && layers[0].id);
        const mapped = parsed.entities.map((ent) => ({
          ...ent,
          id: uid(ent.type || 'e'),
          layer: layerMap[ent.layer] || fallbackLayer,
        }));

        commit(() => {
          if (newLayers.length) setLayers((prev) => [...prev, ...newLayers]);
          setEntities((prev) => [...prev, ...mapped]);
        });

        const skips = parsed.skipped && Object.keys(parsed.skipped).length
          ? Object.entries(parsed.skipped)
              .map(([t, c]) => `${t}×${c}`)
              .join(', ')
          : '';
        setImportNotice(
          skips
            ? `Imported ${mapped.length} entities. Skipped unsupported: ${skips}.`
            : `Imported ${mapped.length} entities.`
        );
        setTimeout(() => setImportNotice(''), 5000);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('DXF import failed', err);
        setImportNotice(`Import failed: ${err.message || err}`);
        setTimeout(() => setImportNotice(''), 5000);
      }
    },
    [layers, activeLayer, commit]
  );

  // -------- grid computation ---------------------------------------------
  const gridLines = useMemo(() => {
    const out = { minor: [], major: [] };
    const stepPx = gridSpacing * zoom;
    if (stepPx < 6) return out; // too dense, skip
    // visible world bounds
    const wx0 = (0 - pan.x) / zoom;
    const wy0 = (0 - pan.y) / zoom;
    const wx1 = (size.w - pan.x) / zoom;
    const wy1 = (size.h - pan.y) / zoom;
    const startX = Math.floor(wx0 / gridSpacing) * gridSpacing;
    const endX = Math.ceil(wx1 / gridSpacing) * gridSpacing;
    const startY = Math.floor(wy0 / gridSpacing) * gridSpacing;
    const endY = Math.ceil(wy1 / gridSpacing) * gridSpacing;
    const maxLines = 1000;
    let count = 0;
    for (let x = startX; x <= endX && count < maxLines; x += gridSpacing, count++) {
      const isMajor = Math.abs(Math.round(x / gridSpacing) % 10) === 0;
      (isMajor ? out.major : out.minor).push({ x1: x, y1: startY, x2: x, y2: endY });
    }
    count = 0;
    for (let y = startY; y <= endY && count < maxLines; y += gridSpacing, count++) {
      const isMajor = Math.abs(Math.round(y / gridSpacing) % 10) === 0;
      (isMajor ? out.major : out.minor).push({ x1: startX, y1: y, x2: endX, y2: y });
    }
    return out;
  }, [gridSpacing, zoom, pan, size]);

  // -------- entity rendering ---------------------------------------------
  const renderEntity = (ent, isSel) => {
    const layer = layerById(ent.layer);
    if (!layer || !layer.visible) return null;
    const p = ent.props || {};
    const stroke = p.stroke || (layer ? layer.color : '#111827');
    const sw = p.width || 2;
    const common = {
      stroke,
      strokeWidth: sw,
      fill: p.fill && p.fill !== 'none' ? p.fill : 'none',
      vectorEffect: 'non-scaling-stroke',
      strokeLinejoin: 'round',
      strokeLinecap: 'round',
    };
    let shape = null;
    if (ent.type === 'line' || ent.type === 'polyline') {
      shape = <polyline points={ent.points.map((pt) => `${pt.x},${pt.y}`).join(' ')} {...common} />;
    } else if (ent.type === 'rect' || ent.type === 'polygon') {
      shape = <polygon points={ent.points.map((pt) => `${pt.x},${pt.y}`).join(' ')} {...common} />;
    } else if (ent.type === 'circle') {
      const c = ent.points[0];
      shape = <circle cx={c.x} cy={c.y} r={p.radius || 0} {...common} />;
    } else if (ent.type === 'text') {
      const c = ent.points[0];
      const fs = p.fontSize || 1;
      shape = (
        <text
          x={c.x}
          y={c.y}
          fill={stroke}
          fontSize={fs}
          style={{ userSelect: 'none' }}
          fontFamily="sans-serif"
        >
          {p.text}
        </text>
      );
    } else if (ent.type === 'block') {
      const c = ent.points[0];
      const size = p.size || 2;
      const half = size / 2;
      const fillColor = p.color || categoryColor(p.category || '');
      const labelFs = size * 0.35;
      shape = (
        <g>
          {p.photoUrl ? (
            <>
              <image
                href={p.photoUrl}
                x={c.x - half}
                y={c.y - half}
                width={size}
                height={size}
                preserveAspectRatio="xMidYMid meet"
              />
              <rect
                x={c.x - half}
                y={c.y - half}
                width={size}
                height={size}
                fill="none"
                stroke={stroke}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : (
            <>
              <circle cx={c.x} cy={c.y} r={half} fill={fillColor} stroke={stroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <text
                x={c.x}
                y={c.y}
                fill="#fff"
                fontSize={size * 0.55}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="sans-serif"
                style={{ userSelect: 'none' }}
              >
                {(p.label || '?').charAt(0).toUpperCase()}
              </text>
            </>
          )}
          {p.label ? (
            <text
              x={c.x}
              y={c.y + half + labelFs}
              fill={stroke}
              fontSize={labelFs}
              textAnchor="middle"
              fontFamily="sans-serif"
              style={{ userSelect: 'none' }}
            >
              {p.label}
            </text>
          ) : null}
        </g>
      );
    }
    return (
      <g key={ent.id}>
        {shape}
        {isSel && renderSelection(ent)}
      </g>
    );
  };

  const renderSelection = (ent) => {
    const hs = 5 / zoom; // handle half-size in world units
    const handlePts = ent.type === 'circle' ? [ent.points[0]] : ent.points;
    return (
      <g>
        {ent.type === 'circle' ? (
          <circle
            cx={ent.points[0].x}
            cy={ent.points[0].y}
            r={ent.props?.radius || 0}
            fill="none"
            stroke={GREEN}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ) : ent.type === 'block' ? (
          <rect
            x={ent.points[0].x - (ent.props?.size || 2) / 2}
            y={ent.points[0].y - (ent.props?.size || 2) / 2}
            width={ent.props?.size || 2}
            height={ent.props?.size || 2}
            fill="none"
            stroke={GREEN}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <polyline
            points={[...ent.points, ent.type === 'rect' || ent.type === 'polygon' ? ent.points[0] : null]
              .filter(Boolean)
              .map((pt) => `${pt.x},${pt.y}`)
              .join(' ')}
            fill="none"
            stroke={GREEN}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {handlePts.map((pt, i) => (
          <rect
            key={i}
            x={pt.x - hs}
            y={pt.y - hs}
            width={hs * 2}
            height={hs * 2}
            fill="#fff"
            stroke={GREEN}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    );
  };

  // -------- draft (in-progress) preview ----------------------------------
  const renderDraft = () => {
    if (!draft) return null;
    const pv = { stroke: GREEN, strokeWidth: 1.5, fill: 'none', vectorEffect: 'non-scaling-stroke', strokeDasharray: '5 4' };
    if (draft.type === 'line') {
      const a = draft.points[0];
      return <line x1={a.x} y1={a.y} x2={cursor.x} y2={cursor.y} {...pv} />;
    }
    if (draft.type === 'rect') {
      const a = draft.points[0];
      const b = cursor;
      const pts = [
        `${a.x},${a.y}`,
        `${b.x},${a.y}`,
        `${b.x},${b.y}`,
        `${a.x},${b.y}`,
      ].join(' ');
      return <polygon points={pts} {...pv} />;
    }
    if (draft.type === 'circle') {
      const c = draft.points[0];
      const r = Math.hypot(cursor.x - c.x, cursor.y - c.y);
      return <circle cx={c.x} cy={c.y} r={r} {...pv} />;
    }
    if (draft.type === 'polyline' || draft.type === 'polygon') {
      const pts = [...draft.points, cursor];
      const closed = draft.type === 'polygon';
      return (
        <g>
          {closed ? (
            <polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')} {...pv} />
          ) : (
            <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} {...pv} />
          )}
          {draft.points.map((p, i) => (
            <rect
              key={i}
              x={p.x - 4 / zoom}
              y={p.y - 4 / zoom}
              width={8 / zoom}
              height={8 / zoom}
              fill="#fff"
              stroke={GREEN}
              strokeWidth={1.25}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      );
    }
    return null;
  };

  // cursor crosshair marker (snap indicator)
  const renderCursor = () => {
    if (tool === 'select' || tool === 'pan') return null;
    const s = 6 / zoom;
    return (
      <g>
        <line x1={cursor.x - s} y1={cursor.y} x2={cursor.x + s} y2={cursor.y} stroke={GREEN} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={cursor.x} y1={cursor.y - s} x2={cursor.x} y2={cursor.y + s} stroke={GREEN} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </g>
    );
  };

  // faint preview marker while placing a selection block
  const renderPlacePreview = () => {
    if (tool !== 'place' || !placingSelection) return null;
    const size = 2;
    const half = size / 2;
    return (
      <g opacity={0.5} pointerEvents="none">
        <rect
          x={cursor.x - half}
          y={cursor.y - half}
          width={size}
          height={size}
          fill={categoryColor(placingSelection.category || '')}
          stroke={GREEN}
          strokeDasharray="3 2"
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  };

  // -------- render --------------------------------------------------------
  const canPan = tool === 'pan';
  const cursorStyle = canPan ? 'grab' : tool === 'select' ? 'default' : 'crosshair';

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 text-gray-800 select-none" style={{ minHeight: 0 }}>
      {/* ===== Header ===== */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => onBack && onBack()}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
        >
          ← Back
        </button>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            markDirty();
          }}
          className="text-sm font-medium px-2 py-1 rounded border border-transparent hover:border-gray-300 focus:border-gray-400 focus:outline-none min-w-[160px]"
        />
        <span className="text-xs text-gray-400">{drawing?.discipline || ''}</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={undo}
            title="Undo (Ctrl+Z)"
            className="px-2 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
          >
            ↶
          </button>
          <button
            onClick={redo}
            title="Redo (Ctrl+Shift+Z)"
            className="px-2 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
          >
            ↷
          </button>
          <span className={`text-xs ${dirty ? 'text-amber-600' : 'text-gray-400'}`}>
            {saving ? 'Saving…' : dirty ? 'Unsaved changes' : savedAt ? 'Saved ✓' : ''}
          </span>
          <button
            onClick={exportDxf}
            title="Export drawing as DXF"
            className="px-2 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
          >
            ⬇ DXF
          </button>
          <button
            onClick={() => dxfFileRef.current && dxfFileRef.current.click()}
            title="Import a DXF file (merges into this drawing)"
            className="px-2 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
          >
            ⬆ DXF
          </button>
          <input
            ref={dxfFileRef}
            type="file"
            accept=".dxf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              importDxfFile(f);
              e.target.value = ''; // allow re-importing the same file
            }}
          />
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 text-sm rounded-md text-white disabled:opacity-60"
            style={{ backgroundColor: GREEN }}
          >
            Save
          </button>
        </div>
      </div>
      {importNotice && (
        <div className="px-3 py-1.5 text-xs bg-green-50 text-green-800 border-b border-green-200 shrink-0">
          {importNotice}
        </div>
      )}

      {/* ===== Body ===== */}
      <div className="flex flex-1 min-h-0">
        {/* --- Left: toolbar + layers --- */}
        <div className="flex shrink-0">
          {/* vertical tool strip */}
          <div className="flex flex-col gap-1 p-1.5 border-r border-gray-200 bg-white">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                title={t.label}
                onClick={() => {
                  setTool(t.id);
                  setDraft(null);
                  setPlacingSelection(null);
                }}
                className="w-9 h-9 flex items-center justify-center rounded-md text-base border"
                style={
                  tool === t.id
                    ? { backgroundColor: GREEN, color: '#fff', borderColor: GREEN }
                    : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#374151' }
                }
              >
                {t.icon}
              </button>
            ))}
            <div className="h-px bg-gray-200 my-1" />
            <button
              title="Selections"
              onClick={() => {
                setShowSelections((v) => {
                  const nv = !v;
                  if (!nv) {
                    setPlacingSelection(null);
                    if (tool === 'place') setTool('select');
                  } else {
                    setShowTakeoff(false); // one right-side overlay at a time
                  }
                  return nv;
                });
              }}
              className="w-9 h-9 flex items-center justify-center rounded-md text-base border"
              style={
                showSelections
                  ? { backgroundColor: GREEN, color: '#fff', borderColor: GREEN }
                  : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#374151' }
              }
            >
              🎨
            </button>
            <button
              title="Takeoff"
              onClick={() => {
                setShowTakeoff((v) => {
                  const nv = !v;
                  if (nv) {
                    setShowSelections(false);
                    setPlacingSelection(null);
                    if (tool === 'place') setTool('select');
                  }
                  return nv;
                });
              }}
              className="w-9 h-9 flex items-center justify-center rounded-md text-base border"
              style={
                showTakeoff
                  ? { backgroundColor: GREEN, color: '#fff', borderColor: GREEN }
                  : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#374151' }
              }
            >
              📊
            </button>
            <div className="h-px bg-gray-200 my-1" />
            <button title="Zoom in" onClick={() => zoomBy(1.2)} className="w-9 h-9 rounded-md border border-gray-200 bg-white hover:bg-gray-100">
              +
            </button>
            <button title="Zoom out" onClick={() => zoomBy(1 / 1.2)} className="w-9 h-9 rounded-md border border-gray-200 bg-white hover:bg-gray-100">
              −
            </button>
            <button title="Zoom to fit" onClick={zoomFit} className="w-9 h-9 rounded-md border border-gray-200 bg-white hover:bg-gray-100 text-xs">
              Fit
            </button>
          </div>

          {/* layers sidebar */}
          {showLayers && (
            <div className="w-56 border-r border-gray-200 bg-white flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Layers</span>
                <div className="flex gap-1">
                  <button onClick={addLayer} title="Add layer" className="w-6 h-6 rounded border border-gray-200 hover:bg-gray-100 text-sm">
                    +
                  </button>
                  <button onClick={() => setShowLayers(false)} title="Collapse" className="w-6 h-6 rounded border border-gray-200 hover:bg-gray-100 text-xs">
                    «
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {layers.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => setActiveLayer(l.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer border-l-2 ${
                      activeLayer === l.id ? 'bg-green-50' : 'hover:bg-gray-50'
                    }`}
                    style={{ borderLeftColor: activeLayer === l.id ? GREEN : 'transparent' }}
                  >
                    <input
                      type="color"
                      value={l.color}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => patchLayer(l.id, { color: e.target.value })}
                      className="w-5 h-5 p-0 border border-gray-300 rounded cursor-pointer shrink-0"
                      title="Layer color"
                    />
                    {renamingLayer === l.id ? (
                      <input
                        autoFocus
                        defaultValue={l.name}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          patchLayer(l.id, { name: e.target.value || l.name });
                          setRenamingLayer(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            patchLayer(l.id, { name: e.target.value || l.name });
                            setRenamingLayer(null);
                          }
                        }}
                        className="flex-1 text-xs px-1 py-0.5 border border-gray-300 rounded min-w-0"
                      />
                    ) : (
                      <span
                        className="flex-1 text-xs truncate"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenamingLayer(l.id);
                        }}
                        title={l.name}
                      >
                        {l.name}
                      </span>
                    )}
                    <button
                      title={l.visible ? 'Hide' : 'Show'}
                      onClick={(e) => {
                        e.stopPropagation();
                        patchLayer(l.id, { visible: !l.visible });
                      }}
                      className="text-sm w-5 h-5 flex items-center justify-center"
                    >
                      {l.visible ? '\u{1F441}' : '–'}
                    </button>
                    <button
                      title={l.locked ? 'Unlock' : 'Lock'}
                      onClick={(e) => {
                        e.stopPropagation();
                        patchLayer(l.id, { locked: !l.locked });
                      }}
                      className="text-sm w-5 h-5 flex items-center justify-center"
                    >
                      {l.locked ? '\u{1F512}' : '\u{1F513}'}
                    </button>
                    <button
                      title="Delete layer"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(l.id);
                      }}
                      className="text-xs w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {/* drawing settings */}
              <div className="border-t border-gray-100 p-3 space-y-2 text-xs">
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Unit</span>
                  <select
                    value={unit}
                    onChange={(e) => {
                      setUnit(e.target.value);
                      markDirty();
                    }}
                    className="border border-gray-300 rounded px-1 py-0.5"
                  >
                    <option value="ft">ft</option>
                    <option value="in">in</option>
                    <option value="m">m</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Grid</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={gridSpacing}
                    onChange={(e) => {
                      setGridSpacing(Math.max(0.1, parseFloat(e.target.value) || 1));
                      markDirty();
                    }}
                    className="w-16 border border-gray-300 rounded px-1 py-0.5"
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Snap to grid</span>
                  <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Stroke width</span>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Math.max(0.5, parseFloat(e.target.value) || 1))}
                    className="w-16 border border-gray-300 rounded px-1 py-0.5"
                  />
                </label>
              </div>
            </div>
          )}
          {!showLayers && (
            <button
              onClick={() => setShowLayers(true)}
              title="Show layers"
              className="w-6 border-r border-gray-200 bg-white text-xs text-gray-400 hover:bg-gray-100"
            >
              »
            </button>
          )}
        </div>

        {/* --- Center: canvas --- */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white" style={{ minWidth: 0 }}>
          <svg
            ref={svgRef}
            width={size.w}
            height={size.h}
            style={{ display: 'block', cursor: cursorStyle, touchAction: 'none' }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              onSvgPointerDown(e);
            }}
            onPointerMove={onSvgPointerMove}
            onPointerUp={onSvgPointerUp}
            onDoubleClick={onSvgDoubleClick}
            onContextMenu={(e) => e.preventDefault()}
          >
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {/* grid */}
              <g>
                {gridLines.minor.map((g, i) => (
                  <line key={`mn${i}`} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="#eef1f4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                ))}
                {gridLines.major.map((g, i) => (
                  <line key={`mj${i}`} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="#d7dde3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                ))}
              </g>
              {/* entities */}
              {entities.map((ent) => renderEntity(ent, ent.id === selectedId))}
              {/* draft preview */}
              {renderDraft()}
              {/* cursor crosshair */}
              {renderCursor()}
              {/* place preview */}
              {renderPlacePreview()}
            </g>
          </svg>

          {/* inline text editor */}
          {textEdit && (
            <input
              autoFocus
              value={textEdit.value}
              onChange={(e) => setTextEdit({ ...textEdit, value: e.target.value })}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitText();
                if (e.key === 'Escape') setTextEdit(null);
              }}
              placeholder="Type text…"
              className="absolute text-sm px-1 py-0.5 border border-gray-400 rounded shadow bg-white"
              style={{
                left: textEdit.x * zoom + pan.x,
                top: textEdit.y * zoom + pan.y - 10,
              }}
            />
          )}

          {/* draft hint */}
          {draft && (draft.type === 'polyline' || draft.type === 'polygon') && (
            <div className="absolute top-2 left-2 text-xs bg-white/90 border border-gray-200 rounded px-2 py-1 text-gray-600 shadow-sm">
              Click to add points · double-click / Enter to finish · Esc to cancel
            </div>
          )}

          {/* place-mode hint */}
          {tool === 'place' && placingSelection && (
            <div className="absolute top-2 left-2 text-xs bg-white/90 border border-green-200 rounded px-2 py-1 text-green-700 shadow-sm">
              Click on the drawing to place <span className="font-medium">{placingSelection.name}</span>. Esc to stop.
            </div>
          )}

          {/* selections palette */}
          {showSelections && (
            <div className="absolute top-2 right-2 bottom-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selections</span>
                <button
                  onClick={() => {
                    setShowSelections(false);
                    setPlacingSelection(null);
                    if (tool === 'place') setTool('select');
                  }}
                  title="Close"
                  className="w-6 h-6 rounded border border-gray-200 hover:bg-gray-100 text-xs"
                >
                  ×
                </button>
              </div>
              <div className="p-2 space-y-2 border-b border-gray-100">
                <input
                  value={selSearch}
                  onChange={(e) => setSelSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                />
                <select
                  value={selCatFilter}
                  onChange={(e) => setSelCatFilter(e.target.value)}
                  className="w-full text-xs px-1 py-1 border border-gray-300 rounded"
                >
                  <option value="All">All categories</option>
                  {selectionCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 overflow-auto p-2">
                {filteredSelections.length === 0 ? (
                  <div className="text-xs text-gray-400 px-1 py-2">
                    {selections.length === 0 ? 'No selections found.' : 'No matches.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredSelections.map((s) => {
                      const active = placingSelection && placingSelection.id === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => chooseSelection(s)}
                          title={s.name}
                          className="flex flex-col text-left rounded border p-1 hover:bg-gray-50"
                          style={
                            active
                              ? { borderColor: GREEN, boxShadow: `0 0 0 1px ${GREEN}` }
                              : { borderColor: '#e5e7eb' }
                          }
                        >
                          <div className="w-full aspect-square rounded overflow-hidden flex items-center justify-center bg-gray-100 mb-1">
                            {s.photo_url ? (
                              <img src={s.photo_url} alt={s.name} className="w-full h-full object-contain" />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center text-white text-lg font-semibold"
                                style={{ backgroundColor: categoryColor(s.category || '') }}
                              >
                                {(s.category || s.name || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] leading-tight font-medium text-gray-700 truncate w-full">{s.name}</span>
                          {s.sub_category ? (
                            <span className="text-[10px] leading-tight text-gray-400 truncate w-full">{s.sub_category}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* takeoff panel (Phase 3) */}
          {showTakeoff && (
            <div className="absolute top-2 right-2 bottom-2 w-[360px] bg-white border border-gray-200 rounded-md shadow-lg flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Takeoff</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={copyTakeoffCsv}
                    title="Copy the full takeoff as CSV to the clipboard"
                    className="text-[11px] px-2 py-1 rounded border hover:bg-gray-100"
                    style={
                      takeoffCopied
                        ? { borderColor: GREEN, color: GREEN }
                        : { borderColor: '#e5e7eb', color: '#374151' }
                    }
                  >
                    {takeoffCopied ? 'Copied ✓' : 'Copy CSV'}
                  </button>
                  <button
                    onClick={() => setShowTakeoff(false)}
                    title="Close"
                    className="w-6 h-6 rounded border border-gray-200 hover:bg-gray-100 text-xs"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* grand material cost */}
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">Material cost</span>
                  <span className="text-lg font-semibold" style={{ color: GREEN }}>
                    {fmtMoney(takeoff.blockTotalCost)}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Only selections with a price contribute to cost.</div>
                <label className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500">
                  <input
                    type="checkbox"
                    checked={takeoffVisibleOnly}
                    onChange={(e) => setTakeoffVisibleOnly(e.target.checked)}
                  />
                  Visible layers only
                </label>
              </div>

              <div className="flex-1 overflow-auto p-3 space-y-4 text-xs">
                {/* A) Selections */}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Selections</div>
                  {takeoff.blockRows.length === 0 ? (
                    <div className="text-gray-400">No selections placed yet.</div>
                  ) : (
                    <>
                      <table className="w-full">
                        <thead>
                          <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-100">
                            <th className="text-left font-medium py-1">Item</th>
                            <th className="text-right font-medium py-1">Qty</th>
                            <th className="text-right font-medium py-1">Price</th>
                            <th className="text-right font-medium py-1">Ext</th>
                          </tr>
                        </thead>
                        <tbody>
                          {takeoff.blockRows.map((r) => (
                            <tr key={r.key} className="border-b border-gray-50 align-top">
                              <td className="py-1 pr-1">
                                <div className="flex items-center gap-1.5">
                                  {r.photoUrl ? (
                                    <img src={r.photoUrl} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                                  ) : null}
                                  <div className="min-w-0">
                                    <div className="text-gray-700 truncate">{r.label}</div>
                                    {r.category ? (
                                      <div className="text-[10px] text-gray-400 truncate">{r.category}</div>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td className="py-1 text-right tabular-nums">{r.qty}</td>
                              <td className="py-1 text-right tabular-nums text-gray-500">
                                {r.price != null ? `$${r.price.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-1 text-right tabular-nums text-gray-700">
                                {r.extended != null ? `$${r.extended.toFixed(2)}` : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200 font-medium text-gray-700">
                            <td className="py-1">Subtotal</td>
                            <td className="py-1 text-right tabular-nums">{takeoff.blockTotalQty}</td>
                            <td></td>
                            <td className="py-1 text-right tabular-nums" style={{ color: GREEN }}>
                              {fmtMoney(takeoff.blockTotalCost)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                      {takeoff.categorySummary.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {takeoff.categorySummary.map((c) => (
                            <span
                              key={c.category}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                            >
                              {c.category}: {c.qty}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* B) Areas */}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Areas</div>
                  {takeoff.areaRows.length === 0 ? (
                    <div className="text-gray-400">No areas drawn yet.</div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-100">
                          <th className="text-left font-medium py-1">Layer</th>
                          <th className="text-right font-medium py-1">#</th>
                          <th className="text-right font-medium py-1">Area</th>
                          <th className="text-right font-medium py-1">Perim</th>
                        </tr>
                      </thead>
                      <tbody>
                        {takeoff.areaRows.map((r) => (
                          <tr key={r.layer} className="border-b border-gray-50">
                            <td className="py-1 text-gray-700 truncate max-w-[110px]">{r.name}</td>
                            <td className="py-1 text-right tabular-nums">{r.count}</td>
                            <td className="py-1 text-right tabular-nums">{fmtArea(r.area)}</td>
                            <td className="py-1 text-right tabular-nums text-gray-500">{fmtLF(r.perim)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-200 font-medium text-gray-700">
                          <td className="py-1">Total</td>
                          <td></td>
                          <td className="py-1 text-right tabular-nums" style={{ color: GREEN }}>
                            {fmtArea(takeoff.areaTotal)}
                          </td>
                          <td className="py-1 text-right tabular-nums text-gray-500">{fmtLF(takeoff.areaPerimTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>

                {/* C) Linear */}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Linear</div>
                  {takeoff.linRows.length === 0 ? (
                    <div className="text-gray-400">No lines drawn yet.</div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-100">
                          <th className="text-left font-medium py-1">Layer</th>
                          <th className="text-right font-medium py-1">#</th>
                          <th className="text-right font-medium py-1">Length</th>
                        </tr>
                      </thead>
                      <tbody>
                        {takeoff.linRows.map((r) => (
                          <tr key={r.layer} className="border-b border-gray-50">
                            <td className="py-1 text-gray-700 truncate max-w-[150px]">{r.name}</td>
                            <td className="py-1 text-right tabular-nums">{r.count}</td>
                            <td className="py-1 text-right tabular-nums">{fmtLF(r.length)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-200 font-medium text-gray-700">
                          <td className="py-1">Total</td>
                          <td></td>
                          <td className="py-1 text-right tabular-nums" style={{ color: GREEN }}>
                            {fmtLF(takeoff.linTotal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- Right: properties --- */}
        {showProps ? (
          <div className="w-60 border-l border-gray-200 bg-white flex flex-col shrink-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Properties</span>
              <button onClick={() => setShowProps(false)} title="Collapse" className="w-6 h-6 rounded border border-gray-200 hover:bg-gray-100 text-xs">
                »
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 text-xs space-y-3">
              {!selected ? (
                <div className="text-gray-400">No selection. Click an entity with the Select tool.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium capitalize">{selected.type}</span>
                  </div>
                  {selected.type !== 'block' && (
                    <div className="text-gray-700 bg-gray-50 rounded px-2 py-1.5 border border-gray-100">{measurementOf(selected)}</div>
                  )}

                  {selected.type === 'block' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-14 rounded border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-100 shrink-0">
                          {selected.props?.photoUrl ? (
                            <img src={selected.props.photoUrl} alt={selected.props?.label || ''} className="w-full h-full object-contain" />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-white text-base font-semibold"
                              style={{ backgroundColor: selected.props?.color || categoryColor(selected.props?.category || '') }}
                            >
                              {(selected.props?.category || selected.props?.label || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-700 truncate">{selected.props?.label || 'Block'}</div>
                          {selected.props?.category ? <div className="text-gray-400 truncate">{selected.props.category}</div> : null}
                        </div>
                      </div>
                      {selected.props?.price != null && selected.props?.price !== '' && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Price</span>
                          <span className="text-gray-700">
                            ${Number(selected.props.price).toFixed(2)}
                            {selected.props?.unit ? ` / ${selected.props.unit}` : ''}
                          </span>
                        </div>
                      )}
                      <label className="flex items-center justify-between gap-2">
                        <span className="text-gray-500">Size</span>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={Number(selected.props?.size || 2)}
                          onChange={(e) => updateSelectedProps({ size: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                          className="w-16 border border-gray-300 rounded px-1 py-0.5"
                        />
                      </label>
                    </div>
                  )}

                  <label className="block">
                    <span className="text-gray-500 block mb-1">Layer</span>
                    <select
                      value={selected.layer}
                      onChange={(e) => moveSelectedToLayer(e.target.value)}
                      className="w-full border border-gray-300 rounded px-1 py-1"
                    >
                      {layers.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selected.type !== 'block' && (
                    <label className="flex items-center justify-between gap-2">
                      <span className="text-gray-500">Stroke</span>
                      <input
                        type="color"
                        value={selected.props?.stroke || '#111827'}
                        onChange={(e) => updateSelectedProps({ stroke: e.target.value })}
                        className="w-8 h-6 border border-gray-300 rounded"
                      />
                    </label>
                  )}

                  {selected.type !== 'block' && (
                    <label className="flex items-center justify-between gap-2">
                      <span className="text-gray-500">Width</span>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={selected.props?.width || 2}
                        onChange={(e) => updateSelectedProps({ width: Math.max(0.5, parseFloat(e.target.value) || 1) })}
                        className="w-16 border border-gray-300 rounded px-1 py-0.5"
                      />
                    </label>
                  )}

                  {(selected.type === 'rect' || selected.type === 'polygon' || selected.type === 'circle') && (
                    <div className="space-y-1">
                      <span className="text-gray-500 block">Fill</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={selected.props?.fill && selected.props.fill !== 'none'}
                            onChange={(e) => updateSelectedProps({ fill: e.target.checked ? '#88a583' : 'none' })}
                          />
                          <span className="text-gray-500">Filled</span>
                        </label>
                        {selected.props?.fill && selected.props.fill !== 'none' && (
                          <input
                            type="color"
                            value={selected.props.fill}
                            onChange={(e) => updateSelectedProps({ fill: e.target.value })}
                            className="w-8 h-6 border border-gray-300 rounded"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {selected.type === 'circle' && (
                    <label className="flex items-center justify-between gap-2">
                      <span className="text-gray-500">Radius</span>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={Number(selected.props?.radius || 0).toFixed(2)}
                        onChange={(e) => updateSelectedProps({ radius: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-16 border border-gray-300 rounded px-1 py-0.5"
                      />
                    </label>
                  )}

                  {selected.type === 'text' && (
                    <>
                      <label className="block">
                        <span className="text-gray-500 block mb-1">Text</span>
                        <input
                          value={selected.props?.text || ''}
                          onChange={(e) => updateSelectedProps({ text: e.target.value })}
                          className="w-full border border-gray-300 rounded px-1 py-1"
                        />
                      </label>
                      <label className="flex items-center justify-between gap-2">
                        <span className="text-gray-500">Font size</span>
                        <input
                          type="number"
                          min="0.2"
                          step="0.1"
                          value={selected.props?.fontSize || 1}
                          onChange={(e) => updateSelectedProps({ fontSize: Math.max(0.2, parseFloat(e.target.value) || 1) })}
                          className="w-16 border border-gray-300 rounded px-1 py-0.5"
                        />
                      </label>
                    </>
                  )}

                  <button
                    onClick={deleteSelected}
                    className="w-full mt-2 px-2 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Delete entity
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowProps(true)}
            title="Show properties"
            className="w-6 border-l border-gray-200 bg-white text-xs text-gray-400 hover:bg-gray-100 shrink-0"
          >
            «
          </button>
        )}
      </div>

      {/* ===== Status bar ===== */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-t border-gray-200 bg-white text-xs text-gray-500 shrink-0">
        <span>
          Tool: <span className="font-medium text-gray-700 capitalize">{tool}</span>
        </span>
        <span>
          x: <span className="text-gray-700">{cursor.x.toFixed(2)}</span> y:{' '}
          <span className="text-gray-700">{cursor.y.toFixed(2)}</span> {unit}
        </span>
        <span>
          Zoom: <span className="text-gray-700">{Math.round((zoom / 20) * 100)}%</span> ({zoom.toFixed(1)} px/{unit})
        </span>
        {draftMeasurement && <span className="text-green-700 font-medium">{draftMeasurement}</span>}
        {selected && !draftMeasurement && <span className="text-gray-700">{measurementOf(selected)}</span>}
        <span className="ml-auto text-gray-400">{entities.length} entit{entities.length === 1 ? 'y' : 'ies'}</span>
      </div>
    </div>
  );
}

// ==== module-level geometry utilities (used by hit testing) ==============
function pointInPoly(pt, poly) {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x,
      yi = poly[i].y,
      xj = poly[j].x,
      yj = poly[j].y;
    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}

function nearAnySegment(p, points, tol, closed) {
  if (!points || points.length < 2) return false;
  for (let i = 0; i < points.length - 1; i++) {
    if (distToSegment(p, points[i], points[i + 1]) <= tol) return true;
  }
  if (closed && points.length >= 3) {
    if (distToSegment(p, points[points.length - 1], points[0]) <= tol) return true;
  }
  return false;
}
