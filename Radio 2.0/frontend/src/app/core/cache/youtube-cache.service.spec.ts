import { TestBed } from '@angular/core/testing';
import { YouTubeCacheService } from './youtube-cache.service';

describe('YouTubeCacheService (TDD)', () => {
  let service: YouTubeCacheService;

  beforeEach(() => {
    let store: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(YouTubeCacheService);
  });

  it('deve armazenar e recuperar resultados de busca normalizando a chave', () => {
    const query = '  Pop Hits 24h  ';
    const mockResults = [
      { youtubeId: 'abc123', title: 'Pop Hit 1', channel: 'Pop Channel', durationSeconds: 210 }
    ];

    service.set(query, mockResults);

    // Deve encontrar mesmo com maiúsculas ou espaços diferentes
    const cached = service.get('pop hits 24h');
    expect(cached).toEqual(mockResults);
  });

  it('deve retornar null se o item não existir no cache', () => {
    const cached = service.get('termo inexistente');
    expect(cached).toBeNull();
  });

  it('deve respeitar o TTL e expirar itens antigos', () => {
    const query = 'rock clássico';
    const mockResults = [{ youtubeId: 'xyz987', title: 'Rock 1', channel: 'Rock Channel', durationSeconds: 180 }];

    // Salva com TTL negativo (já expirado)
    service.setWithTimestamp(query, mockResults, Date.now() - 1000, 500);

    const cached = service.get(query);
    expect(cached).toBeNull();
  });
});
