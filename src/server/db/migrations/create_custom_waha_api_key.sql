-- Add userWahaApiKey column to waha_instance table
DO $$
BEGIN
    -- Check if the column "userWahaApiKey" exists in the "waha_instance" table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'waha_instance'
          AND column_name = 'userWahaApiKey'
    ) THEN
        -- Add the "userWahaApiKey" column to the "waha_instance" table
        ALTER TABLE "public"."waha_instance" ADD COLUMN "userWahaApiKey" TEXT;
        RAISE NOTICE 'Column userWahaApiKey added to waha_instance table successfully.';
    ELSE
        RAISE NOTICE 'Column userWahaApiKey already exists in waha_instance table, skipping.';
    END IF;
END
$$; 