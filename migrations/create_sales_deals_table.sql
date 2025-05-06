-- Create required enums if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_type') THEN
        CREATE TYPE deal_type AS ENUM (
            'unsolicited_bid',
            'unfinanced_restrict',
            'developed_direct',
            'developed_public_bid'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_stage') THEN
        CREATE TYPE deal_stage AS ENUM (
            'verbal_commit',
            'project_launch',
            'site_core_activity',
            'submit_decide',
            'not_started'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_priority') THEN
        CREATE TYPE deal_priority AS ENUM (
            'low',
            'medium',
            'high',
            'urgent'
        );
    END IF;
END
$$;

-- Create sales_deals table
CREATE TABLE IF NOT EXISTS sales_deals (
    id SERIAL PRIMARY KEY,
    deal_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Client/Customer Information
    client_name TEXT NOT NULL,
    client_location TEXT,
    client_contact_name TEXT,
    client_contact_email TEXT,
    
    -- Sales Owner Information
    owner_id VARCHAR REFERENCES users(id),
    owner_name TEXT,
    
    -- Deal Details
    value DECIMAL(12, 2),
    currency TEXT DEFAULT 'USD',
    deal_type deal_type NOT NULL,
    deal_stage deal_stage DEFAULT 'not_started' NOT NULL,
    
    -- Dates
    created_date DATE DEFAULT CURRENT_DATE NOT NULL,
    expected_close_date DATE,
    actual_close_date DATE,
    last_contact_date DATE,
    
    -- Tracking and Status
    priority deal_priority DEFAULT 'medium',
    probability INTEGER DEFAULT 50,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_converted BOOLEAN DEFAULT FALSE,
    converted_project_id INTEGER REFERENCES projects(id),
    
    -- Tags and Categories
    vertical TEXT,
    
    -- Timestamps
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_sales_deals_owner ON sales_deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_sales_deals_stage ON sales_deals(deal_stage);
CREATE INDEX IF NOT EXISTS idx_sales_deals_type ON sales_deals(deal_type);
CREATE INDEX IF NOT EXISTS idx_sales_deals_active ON sales_deals(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_deals_converted ON sales_deals(is_converted);