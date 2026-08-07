# Proposed Category / Sub-Category Taxonomy — for Brian's approval

Driven by the estimator fields (what each material picker pulls) + the current
data. Edit any code/name, add/remove rows. Nothing is committed until you approve.

Legend: **✓data** = matches existing sub-categories · **blank→** = a home for
currently-untagged items · **⚠confirm** = inferred from estimator fields, no data
seen yet (Pool/Steps/Planting/Utilities/Walls weren't in the paste).

Paver rule (your call): collection names (BelAir 2.0, Cambridge, …) become a
**product attribute** (`collection`) on the item, NOT sub-categories.

---

## Categories

| Code | Category |
|---|---|
| TURF | Artificial Turf |
| BASE | Basic Materials |
| COL  | Columns |
| CONC | Concrete |
| DEMO | Demo |
| DRN  | Drainage |
| FIN  | Finishes |
| FP   | Fire Pit |
| GT   | Ground Treatments |
| IRR  | Irrigation |
| LT   | Lighting |
| OK   | Outdoor Kitchen |
| PVR  | Paver |
| PLT  | Planting |
| POOL | Pool |
| STEP | Steps |
| UTIL | Utilities |
| WALL | Walls |
| WATR | Water Features |
| WEED | Weed Abatement |

---

## Sub-categories (by category)

**TURF — Artificial Turf**
- TMAT Turf Material ✓data (10)
- TBASE Turf Base ✓data (3)
- TINF Turf Infill  blank→ (Durafill / ZeoFill)
- TACC Turf Accessories  blank→ (install materials / seam / staples)

**BASE — Basic Materials**
- AGG Aggregate & Concrete ✓data (4)
- RBR Reinforcement ✓data (1)
- GRT Grout ✓data (2)

**COL — Columns**  (23 currently blank → split across these)
- CBLK Column Block/Material
- CFIN Column Finish
- CCAP Column Cap

**CONC — Concrete**  (9 blank →)
- CMIX Concrete Mix
- CBSE Concrete Base
- CACC Concrete Accessories (rebar/mesh/sealer)

**DEMO — Demo**  (18 blank →)
- DDMP Dump Fees
- DHAUL Haul / Container
- DEQP Equipment / Method

**DRN — Drainage**  (22 blank →)
- DPIPE Drain Pipe  (rename existing "Pipe" 13)
- DFIX Drain Fixtures
- DADD Additional Items (pump vault / sump / curb core)

**FIN — Finishes**  (15 blank →)
- FMAT Finish Material (stucco / veneer / tile / stone)
- FCAP Cap

**FP — Fire Pit**  (15 blank →)  *(gas lines/fixtures live under UTIL)*
- FPBLK Structure / Block
- FPFIN Wall Finish
- FPCAP Wall Cap

**GT — Ground Treatments**  (5 blank →; merge "Ground Treaments" typo)
- SOD Sod ✓ · SOIL Soils ✓ · SPREP Soil Prep · FERT Fertilizer ✓ · MULCH Mulch ✓
- DG Decomposed Granite ✓ · GRVL Gravel ✓ · PEBL Pebble ✓ · COBL Cobbles ✓
- STEP Steppers ✓ · EDGE Edging ✓ · FAB Fabrics ✓ (from the typo merge)

**IRR — Irrigation**  (13 blank →; maybe an IFIT Fittings/Misc)
- ICTRL Controllers ✓ · IDRIP Drip ✓ · IGLUE Glue & Solvents ✓
- IPIPE Pipe ✓ · ISPR Sprinklers ✓ · IVLV Valves ✓ · IFIT Fittings/Misc

**LT — Lighting**  (30 blank →)  *(Path/Well collapse into fixture style)*
- LFIX Light Fixture ✓ (Path, Well, etc. become a `style` attribute)
- LTRAN Transformer ✓ · LWIRE Wire ✓

**OK — Outdoor Kitchen**  (15 blank →)  *(gas/elec under UTIL)*
- OKBLK Structure / Block
- OKFIN Wall Finish
- OKCNT Counter / Cap

**PVR — Paver**  (49 blank + ~80 collection sub-cats collapse →)
- PMAT Paver Material  (the paving collections; `collection` = product attribute)
- PWALL Wall  (the "… Wall" collections)
- PBASE Base Material ✓
- PCOPE Coping / Bullnose
- PSTEP Step  *(if you sell paver steps distinctly)*

**PLT — Planting**  (data: Tools 8 + 40 blank →)
- PLPLANT Plants / Plant Material  blank→
- PLTOOL Tools ✓ (8)
- PLAMD Amendments (soil/compost/stakes)  blank→

**POOL — Pool**  (data: 73 blank — everything untagged)  *(gas/elec under UTIL)*
- POTILE Tile · POCOPE Coping · POFIN Interior Finish · POEQP Equipment · POACC Accessories
  (final split pending item names)

**STEP — Steps**  (data: 15 blank →)
- SMAT Step Material  *(or share PVR PMAT — tell me)*

**UTIL — Utilities**  (data: "Utilites" typo + "Electrical" → merge; 7 blank. Most Line/Gas
types are code-defined today and will seed as new rows.)
- ULINE Utility Lines · UGAS Gas Fixtures · UELEC Electrical Fixtures ✓ (merge "Utilites"/"Electrical")

**WALL — Walls**  (data: "Modular" 8 + "Modular Wall" 4 + "Planter Wall" 2 → all WMOD; 23 blank →)
- WBLK Wall Block (CMU)  blank→
- WMOD Modular Wall  ✓ (merge "Modular" + "Modular Wall" + "Planter Wall" — planter is a modular option)
- WFIN Wall Finish  blank→ · WCAP Wall Cap  blank→ · WWP Waterproofing  blank→

**WATR — Water Features**  ⚠confirm (new category — no current items)
- WFEQP Pump / Equipment · WFBSN Basin / Reservoir · WFROK Rock / Feature · WFPLM Plumbing

**WEED — Weed Abatement**  ⚠confirm (new category — no current items)
- WDHRB Herbicide / Chemical · WDFAB Weed Fabric

---

## Status

**Approved:** codes/names · typo merges (Ground Treaments, Utilites) · Walls
Modular merge (incl. Planter Wall → Modular) · Lighting Path/Well as a *style*
attribute · Paver collections as a *collection* attribute · Steps gets its own
`Step Material`.

**Open:**
1. Confirm the starter sub-categories for the two new categories — **Water
   Features (WATR)** and **Weed Abatement (WEED)** — which have no items yet.
2. Per-item homing of the ~350 currently-**blank** rows (Pool 73, Paver 49,
   Planting 40, Lighting 30, Columns 23, Walls 23, Drainage 22, Demo 18,
   Finishes 15, Fire Pit 15, OK 15, Steps 15, Irrigation 13, Concrete 9,
   Utilities 7, GT 5, Turf 3). Next step: I pull the item names per category and
   propose a sub-category for each, for your sign-off, then migrate.
