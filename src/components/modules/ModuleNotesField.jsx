// src/components/modules/ModuleNotesField.jsx
//
// Shared notes textarea rendered directly below the GPMD bar in every
// module. The notes string is the same `notes` column on `estimate_modules`
// that Sam writes into when she pushes a takeoff (see
// supabase/functions/agent-chat/tools.ts → create_estimate_from_takeoff).
// That means a user can read Sam's per-module takeoff right here, type the
// real values into the form below, and the notes stay tied to the module.
//
// The field is intentionally large + plain-text. No rich formatting; the
// content is mostly bullet-y takeoff text and the occasional "called Acme,
// stuck on lead time" note.

// Designed to live INSIDE the same sticky wrapper as the GPMD bar so it
// stays visible while the user scrolls the module form. Default height is
// kept modest (3 rows) so the sticky region doesn't dominate the viewport;
// the textarea is resize-y so a user can drag it taller when filling it in.
export default function ModuleNotesField({ value, onChange, placeholder }) {
  return (
    <div className="bg-white/95 border border-gray-700 rounded-md p-2 shadow-inner">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
          Notes
        </span>
        <span className="text-[10px] text-gray-400">
          Sam writes auto-generated takeoffs here, or use it for your own notes
        </span>
      </div>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={
          placeholder ||
          'Takeoff notes, scope details, vendor info, anything worth remembering for this module…'
        }
        rows={3}
        className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y bg-white placeholder-gray-300 leading-relaxed"
      />
    </div>
  )
}
