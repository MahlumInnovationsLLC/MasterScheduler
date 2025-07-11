-- Add 'offline' to the user_status enum type
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'offline';