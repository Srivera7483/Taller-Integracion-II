CREATE TYPE "AUDIT_EVENT" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'RATE_LIMIT_BLOCKED');

CREATE TABLE "AUDIT_LOGS" (
    "id_audit_log" TEXT NOT NULL,
    "event" "AUDIT_EVENT" NOT NULL,
    "email" TEXT,
    "id_usuario" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AUDIT_LOGS_pkey" PRIMARY KEY ("id_audit_log")
);

CREATE INDEX "AUDIT_LOGS_event_idx" ON "AUDIT_LOGS"("event");
CREATE INDEX "AUDIT_LOGS_fecha_creacion_idx" ON "AUDIT_LOGS"("fecha_creacion");
