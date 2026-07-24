// SkidSteerDemoSummary — grouped In House / Subcontractor / Totals detail view.
import DemoSummaryView from './DemoSummaryView'
import { buildDemoSummary, CFG } from './demoSummaryData'

export default function SkidSteerDemoSummary({ module }) {
  return <DemoSummaryView {...buildDemoSummary(module, CFG.Skid)} />
}
