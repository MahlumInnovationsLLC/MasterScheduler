-- Check if the dev-user-id already exists before inserting
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = 'dev-user-id') THEN
        INSERT INTO users (
            id, 
            username, 
            email, 
            role, 
            is_approved, 
            first_name, 
            last_name, 
            created_at, 
            updated_at,
            password
        ) VALUES (
            'dev-user-id',
            'dev-admin',
            'dev@example.com',
            'admin',
            TRUE,
            'Development',
            'Last',
            NOW(),
            NOW(),
            -- Simple placeholder password for dev user - actual authentication bypassed in dev mode
            '5d41402abc4b2a76b9719d911017c592.hello' 
        );
        RAISE NOTICE 'Development user created successfully';
    ELSE 
        RAISE NOTICE 'Development user already exists';
    END IF;
END $$;