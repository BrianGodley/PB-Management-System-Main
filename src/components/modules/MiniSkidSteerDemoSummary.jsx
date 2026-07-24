// MiniSkidSteerDemoSummary — grouped In House / Subcontractor / Totals detail view.
import DemoSummaryView from './DemoSummaryView'
import { buildDemoSummary, CFG } from './demoSummaryData'

export default function MiniSkidSteerDemoSummary({ module }) {
  return <DemoSummaryView {...buildDemoSummary(module, CFG.Mini)} />
}
