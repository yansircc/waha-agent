-- Create free_emails table
CREATE TABLE IF NOT EXISTS "waha_free_email" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "emailAddress" VARCHAR(255) NOT NULL UNIQUE,
  "alias" VARCHAR(255) UNIQUE,
  "plunkApiKey" TEXT,
  "wechatPushApiKey" TEXT,
  "formSubmitActivated" BOOLEAN NOT NULL DEFAULT false,
  "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
  "createdById" VARCHAR(255) NOT NULL REFERENCES "waha_user"("id"),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "free_email_created_by_idx" ON "waha_free_email"("createdById");
CREATE INDEX IF NOT EXISTS "free_email_email_address_idx" ON "waha_free_email"("emailAddress");
CREATE INDEX IF NOT EXISTS "free_email_alias_idx" ON "waha_free_email"("alias"); 