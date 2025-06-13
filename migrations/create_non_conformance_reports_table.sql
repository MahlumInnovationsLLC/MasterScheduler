
-- Create non_conformance_reports table
CREATE TABLE IF NOT EXISTS non_conformance_reports (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    ncr_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    reported_by VARCHAR(100),
    assigned_to VARCHAR(100),
    date_reported TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_resolved TIMESTAMP,
    root_cause TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ncr_project_id ON non_conformance_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_ncr_status ON non_conformance_reports(status);
CREATE INDEX IF NOT EXISTS idx_ncr_severity ON non_conformance_reports(severity);
CREATE INDEX IF NOT EXISTS idx_ncr_number ON non_conformance_reports(ncr_number);

-- Insert some sample data for testing
INSERT INTO non_conformance_reports (ncr_number, title, description, severity, status, reported_by, assigned_to, project_id) VALUES
('NCR-2024-001', 'Welding Defect in Frame Assembly', 'Incomplete weld penetration found during inspection', 'high', 'open', 'John Smith', 'Mike Johnson', 1),
('NCR-2024-002', 'Incorrect Material Specification', 'Wrong grade steel used in component manufacturing', 'critical', 'in_progress', 'Sarah Davis', 'Tom Wilson', 2),
('NCR-2024-003', 'Surface Finish Quality Issue', 'Surface roughness exceeds specification limits', 'medium', 'resolved', 'Lisa Brown', 'Chris Lee', 3),
('NCR-2024-004', 'Dimensional Tolerance Deviation', 'Part dimensions outside acceptable tolerance range', 'high', 'closed', 'Mark Taylor', 'Anna Garcia', 4),
('NCR-2024-005', 'Documentation Error', 'Missing required certification documents', 'low', 'open', 'Jennifer White', 'David Miller', 5);
