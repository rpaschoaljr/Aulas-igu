import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HeaderComponent } from './header.component';
import { RadioStateService } from '../../core/radio/radio-state.service';
import { YouTubePlayerService } from '../../core/player/youtube-player.service';
import { AuthService } from '../../core/auth/auth.service';

describe('HeaderComponent (TDD - Player Integrado no Topo)', () => {
  let component: HeaderComponent;
  let radioState: RadioStateService;
  let ytPlayer: YouTubePlayerService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RadioStateService,
        {
          provide: YouTubePlayerService,
          useValue: {
            isSoundBlocked: () => false,
            hasPlaybackError: () => false,
            unlockAudio: vi.fn(),
            setMuted: vi.fn(),
            setVolume: vi.fn()
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    radioState = TestBed.inject(RadioStateService);
    ytPlayer = TestBed.inject(YouTubePlayerService);
  });

  it('deve ser instanciado com sucesso', () => {
    expect(component).toBeTruthy();
  });

  it('não deve conter nenhum botão de modo caixa de som (.btn-speaker)', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const btnSpeaker = fixture.nativeElement.querySelector('.btn-speaker');
    expect(btnSpeaker).toBeNull();
  });

  it('deve alternar mute local da rádio através do botão no Header zerando volume no mute e restaurando no desmute', () => {
    expect(radioState.isMuted()).toBe(false);
    expect(radioState.volume()).toBe(80);

    // Muta: volume vira 0
    component.toggleMuteOrUnlock();
    expect(radioState.isMuted()).toBe(true);
    expect(radioState.volume()).toBe(0);
    expect(ytPlayer.setMuted).toHaveBeenCalledWith(true);

    // Desmuta: volume restaura para 80
    component.toggleMuteOrUnlock();
    expect(radioState.isMuted()).toBe(false);
    expect(radioState.volume()).toBe(80);
    expect(ytPlayer.setMuted).toHaveBeenCalledWith(false);
  });

  it('deve desmutar automaticamente ao alterar volume para > 0 no Header', () => {
    // Primeiro muta
    component.toggleMuteOrUnlock();
    expect(radioState.isMuted()).toBe(true);

    const mockEvent = {
      target: { value: '45' }
    } as unknown as Event;

    component.onVolumeChange(mockEvent);
    expect(radioState.volume()).toBe(45);
    expect(radioState.isMuted()).toBe(false);
    expect(ytPlayer.setVolume).toHaveBeenCalledWith(45);
  });

  it('deve emitir requestOpenLogin ao chamar handleLogin()', () => {
    let emitted = false;
    component.requestOpenLogin.subscribe(() => {
      emitted = true;
    });

    component.handleLogin();
    expect(emitted).toBe(true);
  });

  it('deve alertar e emitir requestOpenLogin se um visitante tentar votar para pular música', () => {
    const authService = TestBed.inject(AuthService);
    authService.loginAsGuest('Visitante123', '🎧');

    // Espiona window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    let emitted = false;
    component.requestOpenLogin.subscribe(() => {
      emitted = true;
    });

    component.handleSkipVote();

    expect(alertSpy).toHaveBeenCalled();
    expect(emitted).toBe(true);

    alertSpy.mockRestore();
  });
});
