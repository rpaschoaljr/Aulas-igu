-- ========================================================
-- Rádio 2.0 - Migração 005: Rastreamento de Músicas Mais Pedidas por Usuário
-- ========================================================

CREATE TABLE IF NOT EXISTS user_track_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    youtube_id VARCHAR(50) NOT NULL REFERENCES youtube_tracks(youtube_id) ON DELETE CASCADE,
    request_count INT NOT NULL DEFAULT 1,
    last_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_youtube_request UNIQUE (user_id, youtube_id)
);

CREATE INDEX IF NOT EXISTS idx_user_track_requests_rank 
    ON user_track_requests(user_id, request_count DESC, last_requested_at DESC);

-- Carga retroativa a partir do histórico de reprodução existente
INSERT INTO user_track_requests (user_id, youtube_id, request_count, last_requested_at)
SELECT user_id, youtube_id, COUNT(1) AS request_count, MAX(played_at) AS last_requested_at
FROM playback_history
WHERE user_id IS NOT NULL
GROUP BY user_id, youtube_id
ON CONFLICT (user_id, youtube_id) DO UPDATE
SET request_count = EXCLUDED.request_count,
    last_requested_at = EXCLUDED.last_requested_at;
