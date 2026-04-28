-- Org Charts
CREATE TABLE IF NOT EXISTS org_charts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL DEFAULT 'New Org Chart',
  description TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE org_charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_charts_all" ON org_charts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Node Types (user-defined: Position, Division, Department, etc.)
CREATE TABLE IF NOT EXISTS org_node_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id    UUID NOT NULL REFERENCES org_charts(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#3A5038',
  text_color  TEXT NOT NULL DEFAULT '#FFFFFF',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE org_node_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_node_types_all" ON org_node_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Nodes (chart elements)
CREATE TABLE IF NOT EXISTS org_nodes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id    UUID NOT NULL REFERENCES org_charts(id) ON DELETE CASCADE,
  type_id     UUID REFERENCES org_node_types(id) ON DELETE SET NULL,
  label       TEXT NOT NULL,
  subtitle    TEXT,
  x           NUMERIC NOT NULL DEFAULT 100,
  y           NUMERIC NOT NULL DEFAULT 100,
  width       NUMERIC NOT NULL DEFAULT 180,
  height      NUMERIC NOT NULL DEFAULT 64,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE org_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_nodes_all" ON org_nodes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Edges (connections between nodes)
CREATE TABLE IF NOT EXISTS org_edges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id        UUID NOT NULL REFERENCES org_charts(id) ON DELETE CASCADE,
  source_id       UUID NOT NULL REFERENCES org_nodes(id) ON DELETE CASCADE,
  target_id       UUID NOT NULL REFERENCES org_nodes(id) ON DELETE CASCADE,
  relationship    TEXT NOT NULL DEFAULT 'reports_to',
  label           TEXT,
  style           TEXT NOT NULL DEFAULT 'solid',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE org_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_edges_all" ON org_edges FOR ALL TO authenticated USING (true) WITH CHECK (true);
