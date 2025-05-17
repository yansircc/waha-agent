-- Add userWebhooks column to waha_instance table
DO $$
BEGIN
    -- Check if the column "userWebhooks" exists in the "waha_instance" table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'waha_instance'
          AND column_name = 'userWebhooks'
    ) THEN
        -- Add the "userWebhooks" column to the "waha_instance" table
        ALTER TABLE "public"."waha_instance" ADD COLUMN "userWebhooks" TEXT[];
        RAISE NOTICE 'Column userWebhooks added to waha_instance table successfully.';
    ELSE
        RAISE NOTICE 'Column userWebhooks already exists in waha_instance table, skipping.';
    END IF;
END
$$; 