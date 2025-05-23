-- Create free_emails table
CREATE TABLE IF NOT EXISTS "waha_free_email" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::VARCHAR(255),
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "alias" VARCHAR(255) NOT NULL UNIQUE,
  "plunkApiKey" TEXT NOT NULL,
  "wechatPushApiKey" TEXT,
  "ccEmails" TEXT,
  "redirectUrl" TEXT,
  "disableCaptcha" BOOLEAN NOT NULL DEFAULT false,
  "enableFileUpload" BOOLEAN NOT NULL DEFAULT false,
  "customWebhooks" TEXT,
  "agentId" VARCHAR(255) NOT NULL REFERENCES "waha_agent"("id"),
  "createdById" VARCHAR(255) NOT NULL REFERENCES "waha_user"("id"),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "free_email_email_idx" ON "waha_free_email"("email");
CREATE INDEX IF NOT EXISTS "free_email_created_by_idx" ON "waha_free_email"("createdById");
CREATE INDEX IF NOT EXISTS "free_email_alias_idx" ON "waha_free_email"("alias");
CREATE INDEX IF NOT EXISTS "free_email_agent_idx" ON "waha_free_email"("agentId");