-- ========================================================
-- Rádio 2.0 - Migração 006: Tabela de Músicas Bloqueadas (Quarentena)
-- Armazena vídeos com restrição do YouTube (erro 150/101/100/2)
-- para que o backend nunca mais os recomende ou enfileire.
-- ========================================================

CREATE TABLE IF NOT EXISTS blocked_tracks (
    youtube_id VARCHAR(50) PRIMARY KEY,
    title TEXT NOT NULL,
    channel TEXT,
    error_code INT NOT NULL, -- 150, 101, 100, 2, etc.
    reason TEXT NOT NULL,
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_tracks_at ON blocked_tracks(blocked_at DESC);
