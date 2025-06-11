-- Create the user_department enum type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_department') THEN
        CREATE TYPE user_department AS ENUM (
            'engineering',
            'manufacturing',
            'finance',
            'project_management',
            'quality_control',
            'it',
            'sales',
            'executive',
            'planning_analysis',
            'other'
        );
    END IF;
END $$;

-- Add department column to user_preferences if it doesn't exist
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS department user_department;

-- Add notification preference columns if they don't exist
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS notify_billing_updates BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_project_updates BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_manufacturing_updates BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_system_updates BOOLEAN DEFAULT TRUE;