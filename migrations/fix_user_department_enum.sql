
-- First add the new column with the enum type
ALTER TABLE users ADD COLUMN department_new user_department;

-- Update the new column with converted values from the old text column
UPDATE users SET department_new = 
  CASE 
    WHEN department = 'engineering' THEN 'engineering'::user_department
    WHEN department = 'manufacturing' THEN 'manufacturing'::user_department
    WHEN department = 'finance' THEN 'finance'::user_department
    WHEN department = 'project_management' THEN 'project_management'::user_department
    WHEN department = 'quality_control' THEN 'quality_control'::user_department
    WHEN department = 'it' THEN 'it'::user_department
    WHEN department = 'sales' THEN 'sales'::user_department
    WHEN department = 'executive' THEN 'executive'::user_department
    WHEN department = 'planning_analysis' THEN 'planning_analysis'::user_department
    WHEN department = 'other' THEN 'other'::user_department
    ELSE NULL
  END
WHERE department IS NOT NULL;

-- Drop the old column and rename the new one
ALTER TABLE users DROP COLUMN department;
ALTER TABLE users RENAME COLUMN department_new TO department;
