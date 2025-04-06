CREATE TABLE "wm_agent_to_kb" (
	"agentId" varchar(255) NOT NULL,
	"knowledgeBaseId" varchar(255) NOT NULL,
	CONSTRAINT "wm_agent_to_kb_agentId_knowledgeBaseId_pk" PRIMARY KEY("agentId","knowledgeBaseId")
);
--> statement-breakpoint
ALTER TABLE "wm_agent_to_kb" ADD CONSTRAINT "wm_agent_to_kb_agentId_wm_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."wm_agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wm_agent_to_kb" ADD CONSTRAINT "wm_agent_to_kb_knowledgeBaseId_wm_kb_id_fk" FOREIGN KEY ("knowledgeBaseId") REFERENCES "public"."wm_kb"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_to_kb_agent" ON "wm_agent_to_kb" USING btree ("agentId");--> statement-breakpoint
CREATE INDEX "idx_agent_to_kb_kb" ON "wm_agent_to_kb" USING btree ("knowledgeBaseId");