// src/platform/Slot.jsx
//
// <Slot name="job.tabs" context={{ job }} /> renders every active extension's
// contribution for that named slot. Core drops <Slot> tags at injection points;
// it never imports extension code directly.
//
// Renders nothing when no active extension contributes to the slot — so adding
// <Slot> tags into core is safe and invisible until an extension is enabled.

import { Suspense, lazy, useMemo } from 'react'
import { getSlotContributions } from './registry'
import { useEntitlements } from './entitlements'

function SlotItem({ load, context }) {
  const Comp = useMemo(() => lazy(load), [load])
  return (
    <Suspense fallback={null}>
      <Comp {...(context || {})} />
    </Suspense>
  )
}

export function Slot({ name, context }) {
  const { activeExtensions } = useEntitlements()
  const items = getSlotContributions(activeExtensions, name)
  if (!items.length) return null
  return items.map(it => <SlotItem key={`${it.extId}:${it.id}`} load={it.load} context={context} />)
}

export default Slot
