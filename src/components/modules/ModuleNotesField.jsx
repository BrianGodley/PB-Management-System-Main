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

// Plain, full-width white textarea — three lines tall, with a thin grey
// border and a washed-out placeholder. Lives outside the sticky GPMD bar
// (one element, no wrapper card) and is itself sticky so it pins below
// the GPMD bar while the form scrolls.
export default function ModuleNotesField({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={
        placeholder ||
        'Notes — takeoff details, scope, vendor info, anything worth remembering for this module…'
      }
      rows={3}
      className="block w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-xs leading-relaxed placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y"
    />
  )
}
