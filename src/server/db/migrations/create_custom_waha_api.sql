-- Add userWahaApiEndpoint column to waha_instance table
DO $$
BEGIN
    -- Check if the column "userWahaApiEndpoint" exists in the "waha_instance" table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'waha_instance'
          AND column_name = 'userWahaApiEndpoint'
    ) THEN
        -- Add the "userWahaApiEndpoint" column to the "waha_instance" table
        ALTER TABLE "public"."waha_instance" ADD COLUMN "userWahaApiEndpoint" TEXT;
        RAISE NOTICE 'Column userWahaApiEndpoint added to waha_instance table successfully.';
    ELSE
        RAISE NOTICE 'Column userWahaApiEndpoint already exists in waha_instance table, skipping.';
    END IF;
END
$$; 