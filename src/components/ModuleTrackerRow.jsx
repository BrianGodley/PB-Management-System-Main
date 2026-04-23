// Displays one module row in the Job Tracker: estimated vs actual with progress bar
export default function ModuleTrackerRow({ module, laborRate, onLogEntry }) {
  const estLaborCost = parseFloat(module.estimated_man_days || 0) * laborRate
  const estTotal = estLaborCost + parseFloat(module.estimated_material_cost || 0)

  const actualMD = (module.actual_entries || []).reduce((s, e) => s + parseFloat(e.actual_man_days || 0), 0)
  const actualMaterials = (module.actual_entries || []).reduce((s, e) => s + parseFloat(e.actual_material_cost || 0), 0)
  const actualLaborCost = actualMD * laborRate
  const actualTotal = actualLaborCost + actualMaterials

  const pct = estTotal > 0 ? Math.min(100, (actualTotal / estTotal) * 100) : 0
  const overBudget = actualTotal > estTotal && estTotal > 0

  const crewColors = {
    General: 'bg-gray-100 text-gray-700',
    Demo: 'bg-orange-100 text-orange-700',
    Concrete: 'bg-stone-100 text-stone-700',
    Irrigation: 'bg-blue-100 text-blue-700',
    Planting: 'bg-green-100 text-green-700',
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-3 bg-white">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-gray-900">{module.module_name}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${crewColors[module.crew_type] || crewColors.General}`}>
            {module.crew_type} Crew
          </span>
        </div>
        <button
          onClick={() => onLogEntry(module)}
          className="text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800 transition-colors"
        >
          + Log Entry
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Cost used vs. estimated</span>
          <span className={overBudget ? 'text-red-600 font-semibold' : ''}>{pct.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${overBudget ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${pct}%` }}
          ></div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500 mb-1 font-medium">ESTIMATED</p>
          <p className="text-gray-800">{parseFloat(module.estimated_man_days || 0).toFixed(1)} man days</p>
          <p className="text-gray-800">${parseFloat(module.estimated_material_cost || 0).toLocaleString()} materials</p>
          <p className="font-semibold text-gray-900 mt-1">${estTotal.toLocaleString()} total</p>
        </div>
        <div className={`rounded-lg p-2 ${overBudget ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className={`mb-1 font-medium ${overBudget ? 'text-red-600' : 'text-green-600'}`}>ACTUAL TO DATE</p>
          <p className="text-gray-800">{actualMD.toFixed(1)} man days</p>
          <p className="text-gray-800">${actualMaterials.toLocaleString()} materials</p>
          <p className={`font-semibold mt-1 ${overBudget ? 'text-red-700' : 'text-gray-900'}`}>${actualTotal.toLocaleString()} total</p>
        </div>
      </div>
    </div>
  )
}
