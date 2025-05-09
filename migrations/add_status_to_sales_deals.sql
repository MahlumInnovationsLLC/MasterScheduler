-- Add status column to sales_deals table
ALTER TABLE sales_deals ADD COLUMN IF NOT EXISTS status VARCHAR;

-- Set default value for existing rows
UPDATE sales_deals SET status = 'Not Started' WHERE status IS NULL;

-- Create the deal_status enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_status') THEN
        CREATE TYPE deal_status AS ENUM (
            'AT RISK',
            'Submittal Missed',
            'Complete',
            'In Progress',
            'No Bid',
            'On Hold',
            'Not Started'
        );
    END IF;
END$$;

-- Convert the status column to use the enum type
ALTER TABLE sales_deals 
ALTER COLUMN status TYPE deal_status USING status::deal_status;

-- Add NOT NULL constraint and default value
ALTER TABLE sales_deals 
ALTER COLUMN status SET DEFAULT 'Not Started',
ALTER COLUMN status SET NOT NULL;