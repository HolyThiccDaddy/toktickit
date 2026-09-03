-- CreateTable
CREATE TABLE "TicketCounter" (
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TicketCounter_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE INDEX "Ticket_requesterId_updatedAt_idx" ON "Ticket"("requesterId", "updatedAt");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "RequesterUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
