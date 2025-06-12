
-- Add mechShop column to projects table
ALTER TABLE projects ADD COLUMN mech_shop DATE;

-- Add mechShop column to archived_projects table  
ALTER TABLE archived_projects ADD COLUMN mech_shop DATE;
