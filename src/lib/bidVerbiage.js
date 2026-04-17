// src/lib/bidVerbiage.js
// Maps module types to their section title, numbered scope text, and disclaimer notes.
// Source: Verbiage Sheet - Final.xlsx
// XX placeholders remain for the estimator to fill in when reviewing the generated doc.

export const MODULE_VERBIAGE = {

  // ── Demo modules (all share the same demolition/grading section) ────────────
  'Skid Steer Demo': {
    title: 'DEMOLITION AND GRADING',
    scope: [
      'Remove approximately XX inches of concrete in XX square feet.',
      'Remove approximately XX inches of soils in XX square feet.',
      'Remove an additional cubic feet of soils.',
      'Remove XX square feet of sod or other ground treatment.',
      'Remove square feet of shrubs.',
      'Remove XX quantity of small trees.',
      'Remove XX quantity of medium trees.',
    ],
    notes: [
      'This concrete removal is priced out at a standard 4 inch thickness. Upon demolition it may be discovered that the concrete is thicker and would require an additional change order to cover costs.',
      'Site conditions can vary the total scope of the demolition or grading. This can require a change to final cost of the work.',
      'Picture Build makes every effort to protect in place all existing elements on a job site, including structures, piping, equipment etc. However, some conditions may not be known to the company and could result in some damage requiring a repair. The repairs needed, when Picture Build has taken reasonable precautions, will be at the homeowner\'s expense.',
    ],
  },

  'Mini Skid Steer Demo': {
    title: 'DEMOLITION AND GRADING',
    scope: [
      'Remove approximately XX inches of concrete in XX square feet.',
      'Remove approximately XX inches of soils in XX square feet.',
      'Remove an additional cubic feet of soils.',
      'Remove XX square feet of sod or other ground treatment.',
      'Remove square feet of shrubs.',
      'Remove XX quantity of small trees.',
      'Remove XX quantity of medium trees.',
    ],
    notes: [
      'This concrete removal is priced out at a standard 4 inch thickness. Upon demolition it may be discovered that the concrete is thicker and would require an additional change order to cover costs.',
      'Site conditions can vary the total scope of the demolition or grading. This can require a change to final cost of the work.',
      'Picture Build makes every effort to protect in place all existing elements on a job site, including structures, piping, equipment etc. However, some conditions may not be known to the company and could result in some damage requiring a repair.',
    ],
  },

  'Hand Demo': {
    title: 'DEMOLITION AND GRADING',
    scope: [
      'Remove approximately XX inches of concrete in XX square feet.',
      'Remove approximately XX inches of soils in XX square feet.',
      'Remove an additional cubic feet of soils.',
      'Remove XX square feet of sod or other ground treatment.',
      'Remove square feet of shrubs.',
      'Remove XX quantity of small trees.',
      'Remove XX quantity of medium trees.',
    ],
    notes: [
      'This concrete removal is priced out at a standard 4 inch thickness. Upon demolition it may be discovered that the concrete is thicker and would require an additional change order to cover costs.',
      'Site conditions can vary the total scope of the demolition or grading. This can require a change to final cost of the work.',
    ],
  },

  // ── Pool ────────────────────────────────────────────────────────────────────
  'Pool': {
    title: 'NEW POOL',
    scope: [
      'Excavate for pool and/or spa according to plan set and engineering.',
      'The pool perimeter is XX linear feet and the spa perimeter is XX linear feet.',
      'The average depth of the pool is XX feet and the average depth of the spa is XX feet.',
      'Install shell steel.',
      'Install pool plumbing per code.',
      'Install autofill and water leveling device.',
      'Install new skimmer.',
      'Install Shotcrete for shell.',
      'Install new \'XX\' brand \'XX\' pool coping, approx. XX linear feet (color: \'XX\')',
      'Install waterproofing to raised surfaces as needed, approx. XX square feet',
      'Install new 6" waterline tile, approx. XX linear feet (material allowance: $XX.XX/sf)',
      'Install new tile spillway, approx. XX linear feet (material allowance: $XX.XX/sf)',
      'Install XX (qty) of XX (brand) water features.',
      'Install (XX qty.) new nichless color changing lights',
      'Install 1 new pool and 1 new spa XX (brand) main lights.',
      'Install (XX qty.) new XX brand \'XX\' Horsepower pump(s).',
      'Install (XX qty.) new \'XX\' brand cartridge filter',
      'Install new \'XX\' brand \'XX (model)\' 400k btu heat pump.',
      'Install new "XX" brand spa blower.',
      'Install \'XX\' brand salt chlorination system',
      'Install \'XX\' brand automation system',
    ],
    notes: [
      'Pricing does not include the pool start up which can be done by either the client\'s pool maintenance provider or by Picture Build subcontractors.',
      'City inspectors may require additional elements with the new pool that are not delineated in the pool plan set.',
      'This price does not include engineering and permits.',
      'City required setbacks and other planning requirements may affect where the pool will eventually be installed.',
    ],
  },

  // ── Utilities ───────────────────────────────────────────────────────────────
  'Utilities': {
    title: 'UTILITIES - ELECTRIC',
    scope: [
      'Trench and run electrical from XX to XX, approx. XX linear feet',
      'Install (XX qty.) new GFIC receptacles',
      'Backfill trenches and compact',
      'Trench and run gas from XX to XX, approx. XX linear feet',
      'Install (XX qty.) gas stub-ups',
    ],
    notes: [
      'This price assumes existing electrical service is in good working order and adequate to handle expansion. If it is considered inadequate then additional remedies may be needed including but not limited to upgrading the service panel.',
      'This price assumes existing gas service is in good working order and adequate to handle expansion.',
    ],
  },

  // ── Drainage ────────────────────────────────────────────────────────────────
  'Drainage': {
    title: 'DRAINAGE',
    scope: [
      'Trench for XX linear feet of drainage',
      'Install XX linear feet of SDR35 drainpipe.',
      'Connectors and joints to be primed and glued. Minimum pitch of 1.5%.',
      'Install (XX qty.) of XX drain inlets.',
      'Curb coring is not included.',
    ],
    notes: [
      'Due to site conditions, standard drainage installation may not work due to the lack of pitch required.',
      'Additional remedies may be required resulting in a change of scope and cost to the drainage system.',
      'Existing site drainage that is not covered in the scope may also need repair or replacement upon inspection.',
    ],
  },

  // ── Walls ───────────────────────────────────────────────────────────────────
  'Walls': {
    title: 'WALLS',
    scope: [
      'Layout new wall per plan',
      'Excavate for concrete footings',
      'Set rebar',
      'Pour XX" x XX" concrete footing',
      'Wet lay first course of CMU block, approx. XX linear feet',
      'Install additional courses to reach finish height of XX"',
      'Grout cells',
      'Install \'XX\' wall cap, approx. XX linear feet',
      'Apply XX finish to front side of wall',
      'Apply XX waterproofing to back side of wall if needed.',
      'Install burrito style french drain for wall.',
    ],
    notes: [
      'For jobs requiring retaining walls, the scope of the work and the pricing is subject to engineering and permitting requirements. Thus after those steps are completed the scope may change requiring a change order.',
      'Additional dedicated drainage may be required for retaining walls as well.',
      'Property line walls are subject to location by owner. Any variance in this may require a legal survey at additional cost.',
    ],
  },

  // ── Concrete ────────────────────────────────────────────────────────────────
  'Concrete': {
    title: 'CONCRETE',
    scope: [
      'After demolition, Install 2" of class II roadbase.',
      'Compact base.',
      'Form for XX total square feet of new concrete paving.',
      'Forming to be a total of XX ln feet.',
      'Install #4 rebar 24" on center.',
      'Pour 2500 PSI (pounds per square inch) natural gray concrete, approx. XX square feet',
      'Install control joints as needed',
      'Apply broom finish',
    ],
    notes: [
      'This price does not include necessary permits.',
      'Concrete undergoes chemical reactions creating strength and consistency. This is subject to many variables, like temperature, humidity, exact mix ratios at the plant, delivery time etc. These variables can affect the final product and promote cracking. Picture Build will take every precaution but cannot guarantee crack free concrete even when newly installed.',
      'Colored concrete is subject to underlying concrete consistency and may vary in intensity and depth. Picture Build uses the color hardener method and other methods are available.',
    ],
  },

  // ── Pavers ──────────────────────────────────────────────────────────────────
  'Pavers': {
    title: 'CONCRETE PAVERS',
    scope: [
      'Layout pavers per plan',
      'Excavate paver area to 7" below finish grade if not included in the demolition/grading phase.',
      'Install 3" sleeves as needed',
      'Install 4" of class II roadbase and 1" of washed leveling sand',
      'Install \'XX\' brand \'XX\' pavers, approx. XX square feet (color: \'XX\')',
      'Install \'XX\' paver border',
      'Dig trenches for border paver area and wet lay XX linear feet of border in concrete.',
      'Compact pavers.',
      'Install joint/polymeric sand',
      'Recompact pavers.',
      'Clean paver.',
    ],
    notes: [
      'This price does not include paver sealer.',
      'Occasionally, some paver installations may exhibit a temporary whitish residue upon them. This residue is called efflorescence and is a natural by-product from the cement hydration process. It typically disappears in a very short time and is generally nothing to be concerned about.',
    ],
  },

  // ── Finishes (Flagstone) ────────────────────────────────────────────────────
  'Finishes': {
    title: 'FLAGSTONE PAVING',
    scope: [
      'Layout flagstone paving per plan',
      'Excavate area to 6" depth',
      'Set rebar',
      'Set forms',
      'Pour 4" thick natural gray concrete subbase, approx. XX square feet',
      'Install \'XX\' type flagstone over concrete base, approx. XX square feet',
      'Mortar joints',
    ],
    notes: [
      'Flagstone installation methods vary where some require additional cutting. Based upon preference additional costs may apply.',
      'The client must go to the supplier to choose material prior to order otherwise what is delivered is what will be installed or it will be returned at additional cost.',
      'Samples are only representative and color variation may be more marked in the actual stone to be installed.',
    ],
  },

  // ── Columns ─────────────────────────────────────────────────────────────────
  'Columns': {
    title: 'COLUMNS',
    scope: [
      'Layout new columns per plan',
      'Excavate for concrete footings',
      'Set steel',
      'Pour concrete footings',
      'Create (XX qty.) columns out of CMU block, approx. XX" wide x XX" height',
      'Install \'XX\' cap',
      'Apply XX to exterior of columns, approx. XX square feet',
    ],
    notes: [],
  },

  // ── Outdoor Kitchen ─────────────────────────────────────────────────────────
  'Outdoor Kitchen': {
    title: 'OUTDOOR KITCHEN',
    scope: [
      'Layout cook center per plan',
      'Excavate for concrete footing',
      'Set steel',
      'Run gas line to cook center, approx. XX linear feet',
      'Run electric to cook center, approx. XX linear feet',
      'Pour concrete footings',
      'Construct cook center to finish height of XX" using CMU block.',
      'Grout all kitchen walls.',
      'Set forms and steel for countertop and pour 3" thick natural gray concrete countertop',
      'Apply XX finish to exterior of cook center, approx. XX square feet',
      'Install XX outlets in kitchen',
      'Install owner-provided appliances',
    ],
    notes: [
      'The equipment for the outdoor kitchen provided by the client must be chosen, ordered and onsite prior to the Kitchen Installation. Delays in ordering may delay the project installation or require modification at an additional cost.',
      'Picture Build is not responsible for equipment issues. If the equipment proves faulty in some way, Picture Build may charge for any needed additional remedial work.',
    ],
  },

  // ── Fire Pit ────────────────────────────────────────────────────────────────
  'Fire Pit': {
    title: 'FIRE PIT',
    scope: [
      'Layout new fire pit per plan',
      'Excavate for concrete footings',
      'Trench and run gas line to new fire pit, approx. XX linear feet',
      'Pour concrete footings',
      'Wet lay first course of CMU block, approx. XX linear feet',
      'Install additional courses to reach finish height of XX"',
      'Grout cells',
      'Install XX cap, approx. XX linear feet',
      'Install XX finish to exterior, approx. XX square feet',
      'Install XX finish to interior, approx. XX square feet',
      'Install lava rock to finish height, approx. XX square feet',
    ],
    notes: [],
  },

  // ── Water Features ──────────────────────────────────────────────────────────
  'Water Features': {
    title: 'WATER FEATURE',
    scope: [
      'Layout water feature per plan',
      'Excavate area and install pump basin',
      'Install new related plumbing',
      'Install waterfeature membrane.',
      'Install pump and plug into existing receptacle',
      'Install auto-fill line to fountain',
      'Conceal basin with decorative gravel',
      'Fill basin, turn on system and adjust flow',
    ],
    notes: [],
  },

  // ── Ground Treatments ───────────────────────────────────────────────────────
  'Ground Treatments': {
    title: 'GROUND TREATMENTS',
    scope: [
      'Layout steppers per plan',
      'Excavate for stepper placement',
      'Install XX steppers set in soil. Steppers to be roughly XX" by XX"',
      'Layout dry stream bed per plan',
      'Excavate stream bed area as needed',
      'Lay weed barrier fabric',
      'Create stream bed using \'XX\' gravel bed and XX plus XX sized rocks and boulders',
      'Install XX linear feet of XX edging. Stake roughly every 3 feet.',
      'Layout decomposed granite area per plan',
      'Excavate area to 3"-4" depth',
      'Import and install tan, stabilized d.g. per plan, approx. XX square feet',
      'Lay weed barrier fabric in approx XX square feet.',
      'Install \'XX\' gravel, approx. XX square feet',
      'Install 3 inch layer of XX mulch in approx. XX square feet.',
      'Layout artificial turf area per plan',
      'Excavate turf area to 3"-4" below finish grade',
      'Install 2" of class II base',
      'Compact base',
      'Install 1" of DG',
      'Install XX square feet of XX artificial turf using "S" seaming at joints.',
      'Rough grade sod area.',
      'Till and amend soil, approx. XX square feet',
      'Fine grade and compact soils.',
      'Apply Sod starter.',
      'Install XX sod, approx. XX square feet.',
      'Roll compact new sod.',
    ],
    notes: [
      'PVC benderboard is susceptible to heat and sunlight issues. The benderboard is a pliable product and may warp or heave over time.',
      'Artificial turf can get hot under direct sunlight.',
      'Newly installed Sod requires heavier watering until the roots are established.',
    ],
  },

  // ── Planting ────────────────────────────────────────────────────────────────
  'Planting': {
    title: 'PLANTING',
    scope: [
      'Till and amend planting area soil, approx. XX square feet',
      'Furnish and install the following plant sizes/quantities:',
      '(XX qty.) 36" box trees',
      '(XX qty.) 24" box trees',
      '(XX qty.) 15 gal trees',
      '(XX qty.) 15 gal shrubs',
      '(XX qty.) 15 gal premium hedges',
      '(XX qty.) 15 gal standard hedges',
      '(XX qty.) 15 gal succulents',
      '(XX qty.) 5 gal shrubs',
      '(XX qty.) 5 gal succulents',
      '(XX qty.) 5 gal premium shrubs',
      '(XX qty.) 1 gal shrubs',
      '(XX qty.) 1 gal succulents',
      '(XX qty.) 1 gal premium shrubs',
      '(XX qty.) of 4" pot flats',
      '(XX qty.) of flats of groundcover',
    ],
    notes: [
      'Includes 30 days of Yard Check monitoring.',
      'Monitoring to include: irrigation controller programming (if irrigation installation was performed by Picture Build), plant health diagnosis, replacement of any plant that shows any substantial loss of vitality within allotted warranty time.',
      'Any garden maintenance is still the responsibility of owner.',
      'Pre-existing weedy conditions may likely re-appear despite initial weed removal efforts. Depending upon the type and severity of the weed additional weed abatement efforts will be required by owner.',
      'If the owner is concerned about plant quality and look, it is required that the owner be available at plant delivery. If anything is placed or installed and later rejected, restocking and/or replanting charges may apply.',
    ],
  },

  // ── Irrigation ──────────────────────────────────────────────────────────────
  'Irrigation': {
    title: 'IRRIGATION',
    scope: [
      'Dig XX linear feet of trenches for mainline supply.',
      'Install XX linear feet of mainline piping.',
      'Install (XX qty.) shutoff valves.',
      'Install (XX qty.) anti-siphon valves for planter drip irrigation',
      'Install (XX qty.) anti-siphon valves for subterranean drip irrigation.',
      'Install (XX qty.) anti-siphon valves for spray irrigation',
      'Install (XX qty.) of planter irrigation zones including drip tubing and plant specific emitters.',
      'Install (XX qty.) of spray irrigation including roughly XX spray heads.',
      'Install new \'Rachio\' brand smart irrigation controller',
      'Connect valves to timer',
      'Adjust plants once irrigation system is in place',
    ],
    notes: [
      'Factors such as water pressure and number of heads needed may require additional valves; irrigation will be assessed on site and number of valves will then be determined for best distribution of water.',
      'If additional valves are needed it will be an additional cost to the homeowner.',
      'This price assumes there is an existing receptacle at desired timer location that is in good working condition and adequate to power irrigation timer.',
      'If a new receptacle is needed, it will be an additional charge and billed separately.',
      'In certain cases, drip tubing may be damaged by wildlife and in the event piping is damaged, no warranty or repair will be made by Picture Build.',
    ],
  },

  // ── Lighting ────────────────────────────────────────────────────────────────
  'Lighting': {
    title: 'LIGHTING',
    scope: [
      'Layout lighting locations based upon planting and site conditions.',
      'Install 12 gauge direct burial wiring from transformer location to each light.',
      'Install (XX qty.) XX-watt transformer(s)',
      'Lighting to be Light Craft system.',
      'Install (XX qty.) pathlights',
      'Install (XX qty.) uplights',
      'Install (XX qty.) steplights',
      'Install (XX qty.) wall washer lights',
      'Install (XX LF) bistro lighting',
    ],
    notes: [
      'This price assumes the electrical service is close to and suitable for the new transformer.',
      'If access to certain areas proves difficult, additional charges may apply for additional transformers, receptacles, and drilling under sidewalks, patios, etc.',
    ],
  },
}
