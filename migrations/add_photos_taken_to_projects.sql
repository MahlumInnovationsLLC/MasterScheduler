-- Add the photos_taken column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS photos_taken BOOLEAN DEFAULT FALSE;

-- Also add the column to archived_projects to maintain schema parity
ALTER TABLE archived_projects 
ADD COLUMN IF NOT EXISTS photos_taken BOOLEAN DEFAULT FALSE;