-- ========================================================
-- Rádio 2.0 - Migração 004: Tabela de Logs de Erros e Auditoria
-- Permite feedback em tempo real de falhas no front e back
-- ========================================================

CREATE TABLE IF NOT EXISTS app_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL, -- 'frontend' ou 'backend'
    error_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    room_id VARCHAR(50) REFERENCES radio_rooms(id) ON DELETE SET NULL,
    endpoint VARCHAR(255),
    payload JSONB,
    user_agent TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON app_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON app_error_logs(source);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON app_error_logs(error_type);
