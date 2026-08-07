# Blank-row classification & homing — for Brian's approval

Every currently-blank `material_rates` row, classified. First pass — correct any
line. Legend:
- **→CODE** = a MATERIAL, home to that sub-category (goes to the new `material` table)
- **LAB** = labor → moves to `labor_rates` (out of the material list)
- **SUB** = sub-contractor rate → moves to `subcontractor_rates`
- **FEE** = fee/delivery/dump — NOT a material; see "Fees" question at the bottom

---

### Artificial Turf
- Turf - Infill Durafill →TINF · Turf - Infill ZeoFill →TINF · Turf - Install Materials →TACC

### Columns
- Backsplash Block →CBLK · BBQ Block →CBLK · CMU Block →CBLK · Face Block →CBLK · Fill Block / Grout →CBLK · Rebar - Columns →CBLK
- Ledgerstone Veneer Panels →CFIN · Real Flagstone Flat →CFIN · Real Stone - Columns →CFIN · Sand Stucco →CFIN · Smooth Stucco →CFIN · Stacked Stone Veneer →CFIN · Tile - Columns →CFIN
- Excavate Footing Labor **LAB** · Pour Footing Labor **LAB** · Fill Labor **LAB**
- Ledgerstone … Sub SF **SUB** · Real Flagstone Flat - Sub SF **SUB** · Real Stone … Sub SF **SUB** · Sand Stucco - Sub SF **SUB** · Smooth Stucco - Sub SF **SUB** · Stacked Stone … Sub SF **SUB** · Tile - Columns - Sub SF **SUB**

### Concrete
- Concrete - Color Per CY →CACC · Concrete - Form Lumber LF →CACC · Concrete - Import Base →CBSE · Concrete - Per CY →CMIX · Concrete - Rebar Price SF →CACC · Concrete - Sealer Natural 5gal →CACC · Concrete - Sealer Wet 5gal →CACC · Concrete - Sleeve Per 10LF →CACC · Concrete - Vapor Barrier SF →CACC

### Demo  *(all fees/hauling — none are materials)*
- Dump Fee - Concrete/Dirt/Green Waste/Import Base/Tree-Stump **FEE**
- Demo - Hand/Mini/Skid Dump - * **FEE** · Demo - Hand Container (Low-Boy) **FEE**

### Drainage
- 3"/4"/6" SDR 35 Pipe →DPIPE · 3"/4" Triple Wall Pipe →DPIPE · 3"/4" Perforated Pipe →DPIPE
- 3"/4" Area Drain →DFIX · 3"/4" Atrium Drain →DFIX · 3"/4" Brass Area Drain →DFIX · 4" Paver Top Inlet →DFIX · 9"x9"/12"x12" Catch Basin →DFIX · Downspout Connector →DFIX
- Curb Core →DADD · Hydrocut Under Hardscape →DADD · Pump Vault →DADD · Sump Pump →DADD
- Drain Fitting Fee **FEE**

### Finishes
- Finishes Brick Flatwork →FMAT · Finishes Flagstone Flatwork →FMAT · Finishes Porcelain Flatwork →FMAT · Finishes Tile Flatwork →FMAT · Finishes Concrete Truck →FMAT · Ledgerstone/Real Flagstone/Real Stone/Sand Stucco/Smooth Stucco/Stacked Stone/Tile - Finishes →FMAT
- Finishes Cap Bullnose Brick →FCAP · Finishes Cap Flagstone →FCAP · Finishes Cap Precast →FCAP

### Fire Pit
- FP Block →FPBLK · FP Concrete →FPBLK · FP Rebar →FPBLK · FP Grout Pump Setup →FPBLK
- FP Gas Pipe →(UTIL·UGAS or FPBLK?) · FP Gas Ring/Burner →(UTIL·UGAS?)  ⚠see note
- Ledgerstone/Real Flagstone/Real Stone/Sand Stucco/Smooth Stucco/Stacked Stone/Tile - FP →FPFIN
- FP Sub Structure $/LF **SUB** · FP Sub Structure Ht $/SF **SUB**

### Ground Treatments
- DG Cement Mix →DG · Gravel Fabric →FAB · Mulch →MULCH · Soil Prep →SPREP
- Mulch Delivery Fee **FEE**

### Irrigation
- Irrigation Timer - * (4/6/9/12/15/18 Station, Hunter ICC, Additional Module) →ICTRL
- Irrigation Zone - Drip per Plant/Hillside/Lawn/Planter Dripline/Planter Spray →(these are zone *labor/assemblies*)  ⚠ LAB or IDRIP? see note

### Lighting  *(all 30 are fixture models)*
- COHIBA, BIG SMOKY, CLASSICO, FLORES, JARDIN, MATADOR, MICA AMBER/OPAL, LUCE 5/7,
  MARTELLATO 5/7, STELLA 7, STOGIE, TIPARILLO, PERFECTO, HIGHLITER, CONVEX 16,
  E.T. WALL WASHER, 6W ET / 20W COHIBA POWER FLOOD, OAK/PALM/WALL LITER, PETITE
  FLORES/JARDIN, SPECIFIER ALUMINUM/BRASS, LUNA VIDRIO AMBER, LITTLE SMOKY →LFIX

### Outdoor Kitchen
- BBQ Block →OKBLK · BBQ Concrete →OKBLK · BBQ Fill Material →OKBLK · BBQ Rebar →OKBLK · BBQ Appliance Hardware →OKBLK
- Ledgerstone/Real Flagstone/Real Stone/Sand Stucco/Smooth Stucco/Stacked Stone/Tile - BBQ →OKFIN
- Gas Pipe - BBQ →(UTIL·UGAS?) · GFIC Outlet - BBQ →(UTIL·UELEC?) · Sink Plumbing - BBQ →(UTIL?)  ⚠see note

### Paver  *(collection → product attribute; sub-cat = function)*
- Paving field products (12x24/4x12 Paver, Torino, Turfstone, Slate/Courtyard/
  Porcellana/Heartland/Antique/Estate/Castle Cobble/Pavilion/Permeable*, Holland,
  Paseo II, etc.) →PMAT
- 6x14 Bullnose Coping →PCOPE
- Paver - Base Rock →PBASE
- Paver - Bedding Sand/Joint Sand/Poly Sand/Sealer/Restraint Concrete/Sleeves →(accessory)  ⚠ PMAT accessory or its own PACC? see note
- Paver - Delivery/Pallet Charge **FEE**

### Planting
- All "N gallon / N" box / N" pots / Flats" plant rows →PLPLANT
- Gopher Basket (1/5/15 Gal), Jute Fabric, Mesh Flat, Root Barrier 12/24in, Tree Stake →PLAMD

### Pool
- Coping - * (Arizona/Other Flagstone, Pacific Clay, Paver Bullnose, Pour In Place,
  Precast, Travertine) →POCOPE
- Interior - Quartzscapes/Stonescapes/White Plaster →POFIN
- Tile - */SF, Raised - *Tile/Glass Tile/Segmental/Multi-Piece, Spillway TILE →POTILE
- Raised - Flagstone/Ledgerstone/Stucco/Integral Color Stucco, Spillway FLAGSTONE →POACC
- "N' - N" Lip" (raised bond-beam by height) →POACC
- Equipment models: APUREM, CV340/460/580, JXi400N, RGBW 50'/100', RS-P4/P6/PS4/PS6/PS8,
  VersaTemp, VSHP270AUT/33AUT, VSHP…, Pool Plumbing - Materials →POEQP
- Plumbing - Pool Only / Pool + Spa →(assembly — **SUB** or POEQP?)  ⚠see note
- Shotcrete Material →POACC · Shotcrete Labor **LAB** · Shotcrete Minimum **FEE**

### Steps  *(nearly all are $/SF assemblies or sub-base rates)*
- Steps - Concrete →SMAT
- Steps - Conc *$/SF*, Finish *$/SF* →(these are labor/assembly $/SF)  ⚠ LAB? see note
- Steps - Sub Brick/Conc/Flagstone/Paver/Tile Base **SUB**

### Utilities
- 1"/1-1/2" Black Iron Gas Pipe, 1-1/2" Poly Gas Pipe →ULINE · 12" Single Gas Ring →UGAS
- PVC Conduit with Electrical →ULINE
- Curb Core →(DRN·DADD? it's a drainage item mis-filed in Utilities)  ⚠ · Hydrocut Under Hardscape →⚠ same

### Walls
- Wall Grey Block, Wall Bondbeam Block, Wall Spec Mix Bag 80lb, Wall Concrete Hand Mix,
  Wall Concrete Truck, Wall Rebar, Wall Grout Pump Setup/Per Yard →WBLK
- Ledgerstone/Real Flagstone/Real Stone/Sand Stucco/Smooth Stucco/Stacked Stone/Tile/
  Rustic Wall Stone - Wall →WFIN
- Wall Cap Bullnose Brick/Flagstone/Precast →WCAP
- Wall WP 3 Coat Roll On / Dimple Membrane / Primer Membrane / Thoroseal Roll On →WWP

---

## Routing (RESOLVED)

- **Fees** (Dump Fees, Demo dump/haul/container, Delivery, Pallet Charge, Drain
  Fitting Fee, Mulch Delivery Fee) → new **`misc_rates`** table (Jobs → Settings,
  next to Master Labor Rates).
- **Gas/Electrical module items** (FP Gas Pipe, FP Gas Ring/Burner, Gas Pipe - BBQ,
  GFIC Outlet - BBQ, Sink Plumbing - BBQ) → shared **UTIL** sub-cats
  (UGAS / UELEC / ULINE).
- **Paver accessories** (bedding/joint/poly sand, sealer, sleeves, restraint) → new
  **PACC** (Paver Accessories) sub-category.
- **Labor** → `labor_rates`: Curb Core, Hydrocut, Irrigation `Zone -` rows,
  Steps `… $/SF` + `Finish … $/SF` rows, Pool `Plumbing -` rows, plus the explicit
  `… Labor` rows.
- **Sub** → `subcontractor_rates`: every `… Sub …` / `Sub … Base` row.
