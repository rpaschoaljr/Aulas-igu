import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlaybackHistoryComponent } from './playback-history.component';
import { RadioStateService } from '../../core/radio/radio-state.service';
import { RadioApiService, ApiHistoryItem } from '../../core/api/radio-api.service';
import { of } from 'rxjs';

describe('PlaybackHistoryComponent (TDD - Scroll Infinito)', () => {
  let component: PlaybackHistoryComponent;
  let fixture: ComponentFixture<PlaybackHistoryComponent>;
  let radioState: RadioStateService;
  let mockRadioApi: Partial<RadioApiService>;

  beforeEach(async () => {
    mockRadioApi = {
      getHistory: (roomSlug: string, limit = 20, offset = 0) => {
        return of([
          {
            id: `more-${offset}-1`,
            room_id: 'radio-six-nine',
            youtube_id: `yt-more-${offset}`,
            title: `Música Paginada ${offset}`,
            channel: 'Artista',
            duration_seconds: 180,
            cover_url: '/cover.jpg',
            was_skipped: false,
            played_at: new Date().toISOString()
          }
        ] as ApiHistoryItem[]);
      }
    };

    await TestBed.configureTestingModule({
      imports: [PlaybackHistoryComponent],
      providers: [
        RadioStateService,
        { provide: RadioApiService, useValue: mockRadioApi }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PlaybackHistoryComponent);
    component = fixture.componentInstance;
    radioState = TestBed.inject(RadioStateService);
    fixture.detectChanges();
  });

  it('deve ser criado com sucesso', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir mensagem de estado vazio quando não houver faixas no histórico', () => {
    radioState.setPlaybackHistory([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nenhuma música no histórico ainda');
  });

  it('deve renderizar faixas tocadas e puladas com as devidas badges de status', () => {
    radioState.setPlaybackHistory([
      {
        id: 'h1',
        room_id: 'pop-hits',
        youtube_id: 'y1',
        title: 'As It Was',
        channel: 'Harry Styles',
        duration_seconds: 167,
        cover_url: '/harry.jpg',
        was_skipped: false,
        played_at: new Date().toISOString()
      },
      {
        id: 'h2',
        room_id: 'pop-hits',
        youtube_id: 'y2',
        title: 'Blinding Lights',
        channel: 'The Weeknd',
        duration_seconds: 200,
        cover_url: '/weeknd.jpg',
        was_skipped: true,
        played_at: new Date(Date.now() - 300000).toISOString()
      }
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('As It Was');
    expect(compiled.textContent).toContain('Blinding Lights');

    // Badges
    const playedBadge = compiled.querySelector('.badge-played');
    const skippedBadge = compiled.querySelector('.badge-skipped');

    expect(playedBadge).toBeTruthy();
    expect(playedBadge?.textContent).toContain('Tocada');

    expect(skippedBadge).toBeTruthy();
    expect(skippedBadge?.textContent).toContain('Pulada');
  });

  it('deve chamar loadMore e anexar novas músicas ao atingir o final da rolagem', () => {
    radioState.setPlaybackHistory([
      {
        id: 'init-1',
        room_id: 'radio-six-nine',
        youtube_id: 'yt-1',
        title: 'Música Inicial',
        channel: 'Artista',
        duration_seconds: 180,
        cover_url: '/cover.jpg',
        was_skipped: false,
        played_at: new Date().toISOString()
      }
    ]);

    component.loadMore();

    const updated = radioState.playbackHistory();
    expect(updated.length).toBe(2);
    expect(updated[1].title).toContain('Música Paginada 1');
  });
});
