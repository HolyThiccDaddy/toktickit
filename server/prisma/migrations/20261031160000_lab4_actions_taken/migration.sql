CREATE TYPE "ActionState" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "ActionTaken" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "actionDateTime" TIMESTAMPTZ(6) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "result" VARCHAR(2000) NOT NULL,
    "state" "ActionState" NOT NULL DEFAULT 'OPEN',
    "assigneeId" INTEGER,
    "performedById" INTEGER NOT NULL,
    "completedAt" TIMESTAMPTZ(6),
    "completedById" INTEGER,
    "cancelledAt" TIMESTAMPTZ(6),
    "cancelledById" INTEGER,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" VARCHAR(2000),
    "followUpResolvedAt" TIMESTAMPTZ(6),
    "followUpResolvedById" INTEGER,
    "attachmentNotes" VARCHAR(2000),
    "idempotencyKey" UUID NOT NULL,
    "idempotencyFingerprint" CHAR(64) NOT NULL,
    "idempotencyResponse" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ActionTaken_version_positive_check" CHECK ("version" > 0),
    CONSTRAINT "ActionTaken_description_length_check" CHECK (char_length(btrim("description")) BETWEEN 10 AND 2000),
    CONSTRAINT "ActionTaken_result_length_check" CHECK (char_length(btrim("result")) BETWEEN 1 AND 2000),
    CONSTRAINT "ActionTaken_follow_up_check" CHECK (
      ("followUpRequired" AND "followUpNote" IS NOT NULL AND char_length(btrim("followUpNote")) BETWEEN 1 AND 2000)
      OR (NOT "followUpRequired" AND "followUpNote" IS NULL)
    ),
    CONSTRAINT "ActionTaken_attachment_notes_check" CHECK (
      "attachmentNotes" IS NULL OR char_length(btrim("attachmentNotes")) BETWEEN 1 AND 2000
    ),
    CONSTRAINT "ActionTaken_fingerprint_check" CHECK ("idempotencyFingerprint" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "ActionTaken_resolution_audit_check" CHECK (
      ("followUpResolvedAt" IS NULL AND "followUpResolvedById" IS NULL)
      OR ("followUpRequired" AND "state" = 'COMPLETED' AND "followUpResolvedAt" IS NOT NULL AND "followUpResolvedById" IS NOT NULL)
    ),
    CONSTRAINT "ActionTaken_terminal_audit_check" CHECK (
      ("state" = 'OPEN' AND "completedAt" IS NULL AND "completedById" IS NULL AND "cancelledAt" IS NULL AND "cancelledById" IS NULL)
      OR ("state" = 'IN_PROGRESS' AND "completedAt" IS NULL AND "completedById" IS NULL AND "cancelledAt" IS NULL AND "cancelledById" IS NULL)
      OR ("state" = 'COMPLETED' AND "completedAt" IS NOT NULL AND "completedById" IS NOT NULL AND "cancelledAt" IS NULL AND "cancelledById" IS NULL)
      OR ("state" = 'CANCELLED' AND "cancelledAt" IS NOT NULL AND "cancelledById" IS NOT NULL AND "completedAt" IS NULL AND "completedById" IS NULL)
    )
);

CREATE TABLE "ActionRevision" (
    "id" SERIAL NOT NULL,
    "actionId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "before" JSONB NOT NULL,
    "changedById" INTEGER NOT NULL,
    "changedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionRevision_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ActionRevision_version_positive_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "ActionTaken_ticketId_idempotencyKey_key" ON "ActionTaken"("ticketId", "idempotencyKey");
CREATE INDEX "ActionTaken_ticketId_actionDateTime_id_idx" ON "ActionTaken"("ticketId", "actionDateTime", "id");
CREATE INDEX "ActionTaken_performedById_actionDateTime_idx" ON "ActionTaken"("performedById", "actionDateTime");
CREATE INDEX "ActionTaken_assigneeId_state_idx" ON "ActionTaken"("assigneeId", "state");
CREATE INDEX "ActionTaken_state_completedAt_idx" ON "ActionTaken"("state", "completedAt");
CREATE UNIQUE INDEX "ActionRevision_actionId_version_key" ON "ActionRevision"("actionId", "version");

ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedById_fkey"
  FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_completedById_fkey"
  FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_cancelledById_fkey"
  FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_followUpResolvedById_fkey"
  FOREIGN KEY ("followUpResolvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionRevision" ADD CONSTRAINT "ActionRevision_actionId_fkey"
  FOREIGN KEY ("actionId") REFERENCES "ActionTaken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionRevision" ADD CONSTRAINT "ActionRevision_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "enforce_ActionTaken_immutable_audit"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."ticketId" IS DISTINCT FROM OLD."ticketId"
    OR NEW."performedById" IS DISTINCT FROM OLD."performedById"
    OR NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey"
    OR NEW."idempotencyFingerprint" IS DISTINCT FROM OLD."idempotencyFingerprint"
    OR (OLD."idempotencyResponse" IS NOT NULL AND NEW."idempotencyResponse" IS DISTINCT FROM OLD."idempotencyResponse")
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
    RAISE EXCEPTION 'ActionTaken creation identity is immutable' USING ERRCODE = 'check_violation';
  END IF;
  IF (OLD."completedAt" IS NOT NULL AND (NEW."completedAt" IS DISTINCT FROM OLD."completedAt" OR NEW."completedById" IS DISTINCT FROM OLD."completedById"))
    OR (OLD."cancelledAt" IS NOT NULL AND (NEW."cancelledAt" IS DISTINCT FROM OLD."cancelledAt" OR NEW."cancelledById" IS DISTINCT FROM OLD."cancelledById"))
    OR (OLD."followUpResolvedAt" IS NOT NULL AND (NEW."followUpResolvedAt" IS DISTINCT FROM OLD."followUpResolvedAt" OR NEW."followUpResolvedById" IS DISTINCT FROM OLD."followUpResolvedById")) THEN
    RAISE EXCEPTION 'ActionTaken terminal audit is immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "ActionTaken_immutable_audit_trigger"
BEFORE UPDATE ON "ActionTaken"
FOR EACH ROW EXECUTE FUNCTION "enforce_ActionTaken_immutable_audit"();
