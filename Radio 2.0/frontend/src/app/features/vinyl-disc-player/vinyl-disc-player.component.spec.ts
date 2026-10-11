import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VinylDiscPlayerComponent } from './vinyl-disc-player.component';
import { RadioStateService } from '../../core/radio/radio-state.service';
import { YouTubePlayerService } from '../../core/player/youtube-player.service';

describe('VinylDiscPlayerComponent (TDD)', () => {
  let component: VinylDiscPlayerComponent;
  let fixture: ComponentFixture<VinylDiscPlayerComponent>;
  let radioState: RadioStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VinylDiscPlayerComponent],
      providers: [RadioStateService, YouTubePlayerService]
    }).compileComponents();

    fixture = TestBed.createComponent(VinylDiscPlayerComponent);
    component = fixture.componentInstance;
    radioState = TestBed.inject(RadioStateService);
    fixture.detectChanges();
  });

  it('deve ser criado com sucesso', () => {
    expect(component).toBeTruthy();
  });

  it('deve conter o elemento host do YouTube dentro da div centralizada', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const hostEl = compiled.querySelector('#youtube-player-host');
    expect(hostEl).toBeTruthy();
    expect(hostEl?.classList.contains('youtube-iframe-host')).toBe(true);
  });

  it('deve iniciar com o vídeo oculto e alternar visibilidade ao clicar no botão', () => {
    expect(component.isVideoVisible()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    const videoContainer = compiled.querySelector('.video-center-container');
    expect(videoContainer?.classList.contains('video-hidden')).toBe(true);

    // Clica no botão para mostrar vídeo
    component.toggleVideoVisibility();
    fixture.detectChanges();

    expect(component.isVideoVisible()).toBe(true);
    expect(videoContainer?.classList.contains('video-hidden')).toBe(false);

    // Alça de redimensionamento deve existir quando visível
    const handleEl = compiled.querySelector('.drag-resize-handle');
    expect(handleEl).toBeTruthy();

    // Clica novamente para ocultar
    component.toggleVideoVisibility();
    fixture.detectChanges();
    expect(component.isVideoVisible()).toBe(false);
    expect(videoContainer?.classList.contains('video-hidden')).toBe(true);
  });

  it('deve ajustar o tamanho do vídeo para 100% total quando solicitado', () => {
    component.toggleVideoVisibility();
    fixture.detectChanges();

    component.setVideoSize(100);
    fixture.detectChanges();

    expect(component.videoWidthPercent()).toBe(100);

    const compiled = fixture.nativeElement as HTMLElement;
    const resizableBox = compiled.querySelector('.video-resizable-box') as HTMLElement;
    expect(resizableBox.style.width).toBe('100%');
  });

  it('deve renderizar o disco de vinil giratório com a arte da faixa atual', () => {
    radioState.setNowPlaying({
      queueId: 'q1',
      youtubeId: 'yt1',
      title: 'Bohemian Rhapsody',
      channel: 'Queen',
      coverUrl: '/assets/mock/queen.jpg',
      durationSeconds: 354,
      startedAtUnixMilli: Date.now(),
      startedAt: Date.now(),
      currentOffsetSeconds: 30,
      addedBy: 'DJ'
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const discEl = compiled.querySelector('.vinyl-disc');
    const titleEl = compiled.querySelector('.current-track-title');

    expect(discEl).toBeTruthy();
    expect(titleEl?.textContent).toContain('Bohemian Rhapsody');
    expect(compiled.textContent).toContain('RADIO SIX-NINE');
  });

  it('deve alternar mute no vinil zerando volume no mute e restaurando no desmute', () => {
    expect(radioState.isMuted()).toBe(false);
    expect(radioState.volume()).toBe(80);

    component.toggleMute();
    expect(radioState.isMuted()).toBe(true);
    expect(radioState.volume()).toBe(0);

    component.toggleMute();
    expect(radioState.isMuted()).toBe(false);
    expect(radioState.volume()).toBe(80);
  });

  it('deve desmutar automaticamente ao alterar o slider de volume para > 0 no vinil', () => {
    component.toggleMute();
    expect(radioState.isMuted()).toBe(true);

    const mockEvent = {
      target: { value: '55' }
    } as unknown as Event;

    component.onVolumeChange(mockEvent);
    expect(radioState.isMuted()).toBe(false);
    expect(radioState.volume()).toBe(55);
  });
});
