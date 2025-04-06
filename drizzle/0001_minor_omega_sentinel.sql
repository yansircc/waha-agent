CREATE TABLE "11-waha-mastra_agent" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"prompt" text NOT NULL,
	"knowledgeBaseIds" text[],
	"createdById" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "11-waha-mastra_instance" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"phoneNumber" varchar(20),
	"status" varchar(50) DEFAULT 'disconnected' NOT NULL,
	"agentId" varchar(255),
	"createdById" varchar(255) NOT NULL,
	"qrCode" text,
	"sessionData" jsonb,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "11-waha-mastra_knowledge_base" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"metadata" jsonb,
	"createdById" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "11-waha-mastra_agent" ADD CONSTRAINT "11-waha-mastra_agent_createdById_11-waha-mastra_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."11-waha-mastra_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "11-waha-mastra_instance" ADD CONSTRAINT "11-waha-mastra_instance_agentId_11-waha-mastra_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."11-waha-mastra_agent"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "11-waha-mastra_instance" ADD CONSTRAINT "11-waha-mastra_instance_createdById_11-waha-mastra_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."11-waha-mastra_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "11-waha-mastra_knowledge_base" ADD CONSTRAINT "11-waha-mastra_knowledge_base_createdById_11-waha-mastra_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."11-waha-mastra_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_created_by_idx" ON "11-waha-mastra_agent" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "agent_name_idx" ON "11-waha-mastra_agent" USING btree ("name");--> statement-breakpoint
CREATE INDEX "instance_created_by_idx" ON "11-waha-mastra_instance" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "instance_agent_idx" ON "11-waha-mastra_instance" USING btree ("agentId");--> statement-breakpoint
CREATE INDEX "kb_created_by_idx" ON "11-waha-mastra_knowledge_base" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "kb_name_idx" ON "11-waha-mastra_knowledge_base" USING btree ("name");