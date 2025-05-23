-- Add the PO Dropped Date field to projects table
ALTER TABLE projects ADD COLUMN po_dropped_date DATE;

-- Add poDroppedToDeliveryDays to store the ARO days
ALTER TABLE projects ADD COLUMN po_dropped_to_delivery_days INTEGER DEFAULT 365;

-- Update any existing projects to initialize these values if possible
UPDATE projects 
SET po_dropped_date = start_date 
WHERE po_dropped_date IS NULL AND start_date IS NOT NULL;