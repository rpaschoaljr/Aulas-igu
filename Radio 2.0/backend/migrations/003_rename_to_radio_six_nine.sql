-- Migração 003: Atualiza o nome da sala principal para Radio Six-Nine
UPDATE radio_rooms 
SET name = 'Radio Six-Nine', 
    normalized_name = 'radio six-nine', 
    slug = 'radio-six-nine' 
WHERE id = 'pop-hits';
