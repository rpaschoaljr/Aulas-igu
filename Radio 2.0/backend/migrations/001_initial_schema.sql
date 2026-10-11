-- ========================================================
-- Rádio 2.0 - Migração Inicial do Banco de Dados (PostgreSQL 18)
-- Padrão Universal: Dupla Coluna (Display vs. Normalized)
-- ========================================================

-- Extensões para UUID e busca textual por similaridade (trigram)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Tabela de Usuários (Google OAuth + Convidado)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'guest')),
    provider_id VARCHAR(255),
    
    -- E-mail
    email VARCHAR(255),
    normalized_email VARCHAR(255),
    
    -- Apelido / Nickname (Dupla Coluna)
    nickname VARCHAR(100) NOT NULL,
    normalized_nickname VARCHAR(100) NOT NULL,
    
    avatar_url TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'listener' CHECK (role IN ('listener', 'dj', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Restrições de Unicidade na Coluna Normalizada
    CONSTRAINT uq_users_normalized_nickname UNIQUE (normalized_nickname),
    CONSTRAINT uq_users_normalized_email UNIQUE (normalized_email),
    CONSTRAINT uq_users_provider UNIQUE (provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_users_norm_nick ON users(normalized_nickname);
CREATE INDEX IF NOT EXISTS idx_users_norm_email ON users(normalized_email);

-- 2. Tabela de Salas de Rádio
CREATE TABLE IF NOT EXISTS radio_rooms (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    cover_url TEXT NOT NULL,
    is_live BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_rooms_normalized_name UNIQUE (normalized_name)
);

-- Seed das 3 salas oficiais do Figma
INSERT INTO radio_rooms (id, name, normalized_name, slug, cover_url, is_live)
VALUES 
    ('pop-hits', 'Pop Hits 24h', 'pop hits 24h', 'pop-hits-24h', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300', true),
    ('rock-classico', 'Rock Clássico', 'rock clássico', 'rock-classico', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', true),
    ('festa-balada', 'Festa & Balada', 'festa & balada', 'festa-balada', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Catálogo Permanente do YouTube (Cache Local Database-First)
CREATE TABLE IF NOT EXISTS youtube_tracks (
    youtube_id VARCHAR(50) PRIMARY KEY,
    
    -- Título e Artista (Dupla Coluna)
    title TEXT NOT NULL,
    normalized_title TEXT NOT NULL,
    channel TEXT NOT NULL,
    normalized_channel TEXT NOT NULL,
    
    duration_seconds INT NOT NULL,
    genre VARCHAR(100),
    normalized_genre VARCHAR(100),
    
    thumbnail_default TEXT,
    thumbnail_high TEXT,
    published_at TIMESTAMPTZ,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    tags TEXT[],
    
    -- Metadados JSON brutos completos do YouTube
    raw_metadata JSONB NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yt_norm_title ON youtube_tracks USING gin(normalized_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_yt_norm_channel ON youtube_tracks USING gin(normalized_channel gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_yt_norm_genre ON youtube_tracks(normalized_genre);
CREATE INDEX IF NOT EXISTS idx_yt_duration ON youtube_tracks(duration_seconds);

-- 4. Fila de Reprodução Atual
CREATE TABLE IF NOT EXISTS queue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(50) NOT NULL REFERENCES radio_rooms(id) ON DELETE CASCADE,
    youtube_id VARCHAR(50) NOT NULL REFERENCES youtube_tracks(youtube_id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    normalized_title TEXT NOT NULL,
    channel TEXT NOT NULL,
    normalized_channel TEXT NOT NULL,
    duration_seconds INT NOT NULL,
    cover_url TEXT,
    
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_nickname VARCHAR(100) NOT NULL,
    normalized_user_nickname VARCHAR(100) NOT NULL,
    
    position INT NOT NULL,
    is_dj_track BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_room_pos ON queue_items(room_id, position);
CREATE INDEX IF NOT EXISTS idx_queue_norm_user ON queue_items(room_id, normalized_user_nickname);

-- 5. Histórico de Reprodução
CREATE TABLE IF NOT EXISTS playback_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(50) NOT NULL REFERENCES radio_rooms(id) ON DELETE CASCADE,
    youtube_id VARCHAR(50) NOT NULL REFERENCES youtube_tracks(youtube_id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    normalized_title TEXT NOT NULL,
    channel TEXT NOT NULL,
    normalized_channel TEXT NOT NULL,
    duration_seconds INT NOT NULL,
    cover_url TEXT,
    
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_nickname VARCHAR(100),
    normalized_user_nickname VARCHAR(100),
    
    was_skipped BOOLEAN NOT NULL DEFAULT false,
    skip_votes_count INT NOT NULL DEFAULT 0,
    played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hist_room_played ON playback_history(room_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_hist_norm_title ON playback_history(room_id, normalized_title);

-- 6. DJ Automático (Faixas de Fallback)
CREATE TABLE IF NOT EXISTS dj_fallback_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(50) NOT NULL REFERENCES radio_rooms(id) ON DELETE CASCADE,
    youtube_id VARCHAR(50) NOT NULL,
    
    title TEXT NOT NULL,
    normalized_title TEXT NOT NULL,
    channel TEXT NOT NULL,
    normalized_channel TEXT NOT NULL,
    duration_seconds INT NOT NULL,
    cover_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    order_index INT NOT NULL DEFAULT 0
);

-- 7. Votos para Pular Música
CREATE TABLE IF NOT EXISTS skip_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(50) NOT NULL REFERENCES radio_rooms(id) ON DELETE CASCADE,
    track_youtube_id VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Impede voto duplicado
    CONSTRAINT uq_user_track_vote UNIQUE (room_id, track_youtube_id, user_id)
);

-- 8. Mensagens de Chat (Chatativo)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(50) NOT NULL REFERENCES radio_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_nickname VARCHAR(100) NOT NULL,
    normalized_user_nickname VARCHAR(100) NOT NULL,
    user_avatar TEXT NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_room_created ON chat_messages(room_id, created_at DESC);
