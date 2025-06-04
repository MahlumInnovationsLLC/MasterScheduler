
-- Migration to add phase visibility controls to projects table
-- This allows projects to hide specific phases from the bay schedule

ALTER TABLE projects 
ADD COLUMN show_fab_phase BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN show_paint_phase BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN show_production_phase BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN show_it_phase BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN show_ntc_phase BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN show_qc_phase BOOLEAN DEFAULT true NOT NULL;

-- Add comments to explain the purpose of these columns
COMMENT ON COLUMN projects.show_fab_phase IS 'Controls whether the fabrication phase is displayed in bay schedule';
COMMENT ON COLUMN projects.show_paint_phase IS 'Controls whether the paint phase is displayed in bay schedule';
COMMENT ON COLUMN projects.show_production_phase IS 'Controls whether the production phase is displayed in bay schedule';
COMMENT ON COLUMN projects.show_it_phase IS 'Controls whether the IT phase is displayed in bay schedule';
COMMENT ON COLUMN projects.show_ntc_phase IS 'Controls whether the NTC phase is displayed in bay schedule';
COMMENT ON COLUMN projects.show_qc_phase IS 'Controls whether the QC phase is displayed in bay schedule';
