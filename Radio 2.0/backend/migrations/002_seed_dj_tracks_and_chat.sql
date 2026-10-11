-- ========================================================
-- Rádio 2.0 - Migração 002: Seed de Faixas de DJ e Chat Inicial
-- ========================================================

-- 1. Catálogo de faixas temáticas reais no YouTube (youtube_tracks)
INSERT INTO youtube_tracks (
    youtube_id, title, normalized_title, channel, normalized_channel,
    duration_seconds, thumbnail_high, raw_metadata
)
VALUES
    -- Pop Hits (Sala: pop-hits)
    ('fJ9rUzIMcZQ', 'Queen - Bohemian Rhapsody', 'queen - bohemian rhapsody', 'Queen Official', 'queen official', 354, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', '{"genre":"rock"}'),
    ('QkF3oxziUi4', 'Led Zeppelin - Stairway to Heaven', 'led zeppelin - stairway to heaven', 'Led Zeppelin', 'led zeppelin', 482, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300', '{"genre":"rock"}'),
    ('pAgnJDJN4VA', 'AC/DC - Back In Black', 'ac/dc - back in black', 'AC/DC', 'ac/dc', 255, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', '{"genre":"rock"}'),
    ('_FrOQC-zSog', 'Pink Floyd - Comfortably Numb', 'pink floyd - comfortably numb', 'Pink Floyd', 'pink floyd', 382, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300', '{"genre":"rock"}'),
    ('1w7OgIMMRc4', 'Guns N'' Roses - Sweet Child O'' Mine', 'guns n'' roses - sweet child o'' mine', 'Guns N'' Roses', 'guns n'' roses', 302, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', '{"genre":"rock"}'),

    -- Rock Clássico (Sala: rock-classico)
    ('fJ9rUzIMcZQ', 'Queen - Bohemian Rhapsody', 'queen - bohemian rhapsody', 'Queen Official', 'queen official', 354, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', '{"genre":"rock"}'),
    ('QkF3oxziUi4', 'Led Zeppelin - Stairway to Heaven', 'led zeppelin - stairway to heaven', 'Led Zeppelin', 'led zeppelin', 482, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300', '{"genre":"rock"}'),
    ('pAgnJDJN4VA', 'AC/DC - Back In Black', 'ac/dc - back in black', 'AC/DC', 'ac/dc', 255, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', '{"genre":"rock"}'),
    ('_FrOQC-zSog', 'Pink Floyd - Comfortably Numb', 'pink floyd - comfortably numb', 'Pink Floyd', 'pink floyd', 382, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300', '{"genre":"rock"}'),
    ('1w7OgIMMRc4', 'Guns N'' Roses - Sweet Child O'' Mine', 'guns n'' roses - sweet child o'' mine', 'Guns N'' Roses', 'guns n'' roses', 302, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', '{"genre":"rock"}'),

    -- Festa & Balada (Sala: festa-balada)
    ('FGBhQbmMxH8', 'Daft Punk - One More Time', 'daft punk - one more time', 'Daft Punk', 'daft punk', 320, 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300', '{"genre":"eletronica"}'),
    ('ebXbLfLACGM', 'Calvin Harris - Summer', 'calvin harris - summer', 'Calvin Harris', 'calvin harris', 222, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300', '{"genre":"eletronica"}'),
    ('JRfuAukYTKg', 'David Guetta ft. Sia - Titanium', 'david guetta ft. sia - titanium', 'David Guetta', 'david guetta', 245, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300', '{"genre":"eletronica"}'),
    ('IcrbM1l_BoI', 'Avicii - Wake Me Up', 'avicii - wake me up', 'Avicii', 'avicii', 247, 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300', '{"genre":"eletronica"}'),
    ('1_4ELAxKrDc', 'Tiësto - The Business', 'tiesto - the business', 'Tiesto', 'tiesto', 164, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300', '{"genre":"eletronica"}')
ON CONFLICT (youtube_id) DO NOTHING;

-- 2. Faixas de Reserva do DJ por Sala (dj_fallback_tracks)
INSERT INTO dj_fallback_tracks (
    room_id, youtube_id, title, normalized_title, channel, normalized_channel,
    duration_seconds, cover_url, is_active, order_index
)
VALUES
    -- Pop Hits
    ('pop-hits', '4TWR90KJl84', 'Dua Lipa - Levitating', 'dua lipa - levitating', 'Dua Lipa', 'dua lipa', 203, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300', true, 1),
    ('pop-hits', '4NRXx6U8ABQ', 'The Weeknd - Blinding Lights', 'the weeknd - blinding lights', 'The Weeknd', 'the weeknd', 200, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', true, 2),
    ('pop-hits', 'H5v3kku4y6Q', 'Harry Styles - As It Was', 'harry styles - as it was', 'Harry Styles', 'harry styles', 167, 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300', true, 3),
    ('pop-hits', 'UqyT8IEBkvY', 'Bruno Mars - 24K Magic', 'bruno mars - 24k magic', 'Bruno Mars', 'bruno mars', 226, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300', true, 4),
    ('pop-hits', 'ic8j13piAhQ', 'Taylor Swift - Cruel Summer', 'taylor swift - cruel summer', 'Taylor Swift', 'taylor swift', 178, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300', true, 5),

    -- Rock Clássico
    ('rock-classico', 'fJ9rUzIMcZQ', 'Queen - Bohemian Rhapsody', 'queen - bohemian rhapsody', 'Queen Official', 'queen official', 354, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', true, 1),
    ('rock-classico', 'QkF3oxziUi4', 'Led Zeppelin - Stairway to Heaven', 'led zeppelin - stairway to heaven', 'Led Zeppelin', 'led zeppelin', 482, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300', true, 2),
    ('rock-classico', 'pAgnJDJN4VA', 'AC/DC - Back In Black', 'ac/dc - back in black', 'AC/DC', 'ac/dc', 255, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', true, 3),
    ('rock-classico', '_FrOQC-zSog', 'Pink Floyd - Comfortably Numb', 'pink floyd - comfortably numb', 'Pink Floyd', 'pink floyd', 382, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300', true, 4),
    ('rock-classico', '1w7OgIMMRc4', 'Guns N'' Roses - Sweet Child O'' Mine', 'guns n'' roses - sweet child o'' mine', 'Guns N'' Roses', 'guns n'' roses', 302, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', true, 5),

    -- Festa & Balada
    ('festa-balada', 'FGBhQbmMxH8', 'Daft Punk - One More Time', 'daft punk - one more time', 'Daft Punk', 'daft punk', 320, 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300', true, 1),
    ('festa-balada', 'ebXbLfLACGM', 'Calvin Harris - Summer', 'calvin harris - summer', 'Calvin Harris', 'calvin harris', 222, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300', true, 2),
    ('festa-balada', 'JRfuAukYTKg', 'David Guetta ft. Sia - Titanium', 'david guetta ft. sia - titanium', 'David Guetta', 'david guetta', 245, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300', true, 3),
    ('festa-balada', 'IcrbM1l_BoI', 'Avicii - Wake Me Up', 'avicii - wake me up', 'Avicii', 'avicii', 247, 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300', true, 4),
    ('festa-balada', '1_4ELAxKrDc', 'Tiësto - The Business', 'tiesto - the business', 'Tiesto', 'tiesto', 164, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300', true, 5)
ON CONFLICT DO NOTHING;

-- 3. Mensagens Iniciais do Chatativo por Sala (chat_messages)
INSERT INTO chat_messages (
    room_id, user_nickname, normalized_user_nickname, user_avatar, message_text, created_at
)
VALUES
    -- Pop Hits
    ('pop-hits', 'DJ Paschoal', 'dj paschoal', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100', 'Bem-vindos à Pop Hits 24h! Peçam suas músicas na fila!', NOW() - INTERVAL '10 minutes'),
    ('pop-hits', 'Mariana Pop', 'mariana pop', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', 'Essa rádio é demais, o som tá incrível! 🔥', NOW() - INTERVAL '5 minutes'),
    ('pop-hits', 'Lucas Som', 'lucas som', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', 'Acabei de pedir Dua Lipa, votem pra subir!', NOW() - INTERVAL '2 minutes'),

    -- Rock Clássico
    ('rock-classico', 'Mestre do Rock', 'mestre do rock', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100', 'Aqui é só rock de verdade! Vida longa ao Rock!', NOW() - INTERVAL '15 minutes'),
    ('rock-classico', 'Camila Guitar', 'camila guitar', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', 'Solo do Pink Floyd tá absurdo hoje! 🎸', NOW() - INTERVAL '8 minutes'),

    -- Festa & Balada
    ('festa-balada', 'DJ Balada', 'dj balada', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100', 'Sextou na Rádio 2.0! O grave tá batendo forte!', NOW() - INTERVAL '12 minutes'),
    ('festa-balada', 'Bia Eletrônica', 'bia eletronica', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', 'Aumenta que essa do Avicii é clássica! 🔊', NOW() - INTERVAL '4 minutes');
