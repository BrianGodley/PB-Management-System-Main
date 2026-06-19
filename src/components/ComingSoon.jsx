// src/components/ComingSoon.jsx
//
// Polished placeholder for features that are scoped but not yet built (e.g. the
// new Sales/Marketing tabs: Funnels, Website Builder, Social Media, Contact
// Workflows). Shows the feature name, a short pitch, and a preview of what's
// coming so the tab feels intentional rather than empty.

export default function ComingSoon({ icon = '✨', title, blurb, points = [], eta }) {
  return (
    <div className="flex-1 flex items-center justify-center py-16 px-6">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">{icon}</div>
        <div className="inline-block text-[11px] font-semibold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1 mb-3">
          {eta || 'Coming soon'}
        </div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {blurb && <p className="text-sm text-gray-500 mt-2">{blurb}</p>}

        {points.length > 0 && (
          <ul className="mt-6 text-left space-y-2.5 bg-gray-50 border border-gray-200 rounded-xl p-5">
            {points.map(p => (
              <li key={p} className="flex gap-2.5 text-sm text-gray-700">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 10.5l3.5 3.5L15 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
