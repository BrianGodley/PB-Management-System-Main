// src/platform/index.js
//
// Public surface of the extension platform. Import from here:
//   import { Slot, useEntitlements, isModuleEnabled, hooks } from '../platform'
//
// Nothing here changes app behavior until core starts using it (Slots, plan
// gating) and a tenant enables an extension.

export {
  PLATFORM_API_VERSION,
  allExtensions,
  getActiveExtensions,
  getExtensionModules,
  getSlotContributions,
  getHookLoaders,
} from './registry'

export { Slot } from './Slot'
export { EntitlementsProvider, useEntitlements, isModuleEnabled, useModule, IfModule } from './entitlements'
export * as hooks from './hooks'
