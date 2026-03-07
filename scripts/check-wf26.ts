#!/usr/bin/env bun
// @ts-nocheck
import "../envConfig";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";

const url = process.env.DATABASE_URL!;
const authToken = process.env.TURSO_GROUP_AUTH_TOKEN;
const client = createClient({ url, authToken });
const db = drizzle(client, { schema });

const workflows = await db.select().from(schema.workflows).where(eq(schema.workflows.applicantId, 26));
console.log("WF-26 Workflows:", JSON.stringify(workflows.map(w => ({
  id: w.id,
  applicantId: w.applicantId,
  status: w.status,
  stage: w.stage,
  procurementCleared: w.procurementCleared,
  documentsComplete: w.documentsComplete,
  aiAnalysisComplete: w.aiAnalysisComplete,
  startedAt: w.startedAt,
  completedAt: w.completedAt,
})), null, 2));

// Also check recent workflow events
const events = await db.select().from(schema.workflowEvents)
  .where(eq(schema.workflowEvents.workflowId, 26));
console.log("\nRecent Events:", JSON.stringify(events.slice(-10).map(e => ({
  type: e.eventType,
  createdAt: e.createdAt
})), null, 2));
process.exit(0);
