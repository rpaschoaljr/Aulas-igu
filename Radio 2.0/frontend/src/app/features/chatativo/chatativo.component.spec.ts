import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatativoComponent } from './chatativo.component';
import { RealWebSocketService, ChatMessage } from '../../core/websocket/real-websocket.service';
import { AuthService } from '../../core/auth/auth.service';
import { User } from '../../core/auth/user.model';
import { signal } from '@angular/core';

describe('ChatativoComponent (TDD - Auto-Scroll Inteligente Tipo WhatsApp)', () => {
  let component: ChatativoComponent;
  let fixture: ComponentFixture<ChatativoComponent>;
  let mockRealWs: any;
  let mockAuthService: any;

  const mockChatSignal = signal<ChatMessage[]>([]);
  const mockUserSignal = signal<User | null>(null);

  beforeEach(async () => {
    mockChatSignal.set([]);
    mockUserSignal.set({
      id: 'user-1',
      nickname: 'Paschoal',
      token: 'fake-jwt',
      avatarUrl: '🚀',
      isGuest: false
    });

    mockRealWs = {
      chatMessages: mockChatSignal,
      sendChatMessage: vi.fn()
    };

    mockAuthService = {
      currentUser: mockUserSignal
    };

    await TestBed.configureTestingModule({
      imports: [ChatativoComponent],
      providers: [
        { provide: RealWebSocketService, useValue: mockRealWs },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatativoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar com isNearBottom = true', () => {
    expect(component).toBeTruthy();
    expect(component.isNearBottom).toBe(true);
  });

  it('deve detectar corretamente mensagens do próprio usuário e de outros', () => {
    expect(component.isMyMessage('Paschoal')).toBe(true);
    expect(component.isMyMessage('OutroOuvinte')).toBe(false);
  });

  it('deve identificar avatares emoji vs imagens http', () => {
    expect(component.isEmoji('🎧')).toBe(true);
    expect(component.isEmoji('https://example.com/avatar.jpg')).toBe(false);
    expect(component.isEmoji(undefined)).toBe(true);
  });

  describe('Lógica de Detecção de Rolagem (onScroll)', () => {
    it('deve manter isNearBottom = true se o usuário estiver próximo ao rodapé (<= 60px)', () => {
      const mockElement = {
        scrollHeight: 1000,
        scrollTop: 700,
        clientHeight: 260 // 1000 - 700 - 260 = 40px <= 60px
      } as HTMLElement;

      Object.defineProperty(component, 'scrollContainer', {
        value: () => ({ nativeElement: mockElement })
      });

      component.onScroll();
      expect(component.isNearBottom).toBe(true);
    });

    it('deve mudar isNearBottom para false se o usuário rolar para cima (> 60px)', () => {
      const mockElement = {
        scrollHeight: 1000,
        scrollTop: 400,
        clientHeight: 260 // 1000 - 400 - 260 = 340px > 60px
      } as HTMLElement;

      Object.defineProperty(component, 'scrollContainer', {
        value: () => ({ nativeElement: mockElement })
      });

      component.onScroll();
      expect(component.isNearBottom).toBe(false);
    });
  });

  describe('Envio de Mensagem (sendMessage)', () => {
    it('não deve enviar mensagem se o texto for vazio', () => {
      component.newMessage.set('   ');
      component.sendMessage(new Event('submit'));

      expect(mockRealWs.sendChatMessage).not.toHaveBeenCalled();
    });

    it('deve enviar mensagem, limpar o input e forçar scroll para o final', async () => {
      const scrollSpy = vi.spyOn(component, 'scrollToBottom');

      component.newMessage.set('Olá mundo da rádio!');
      component.sendMessage(new Event('submit'));

      expect(mockRealWs.sendChatMessage).toHaveBeenCalledWith('Paschoal', '🚀', 'Olá mundo da rádio!');
      expect(component.newMessage()).toBe('');
      expect(component.isNearBottom).toBe(true);
      expect(scrollSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('Preservação de Leitura vs Auto-Scroll com Novas Mensagens', () => {
    it('deve rolar automaticamente quando novas mensagens chegarem se o usuário estiver no fim', async () => {
      const scrollSpy = vi.spyOn(component, 'scrollToBottom');
      component.isNearBottom = true;

      // Adiciona mensagem recebida e aciona ciclo reativo do Angular
      mockChatSignal.set([
        {
          id: '1',
          userNickname: 'DJ Carlos',
          userAvatar: '🎵',
          text: 'Tocando agora o melhor som!',
          timestamp: Date.now()
        }
      ]);
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(scrollSpy).toHaveBeenCalled();
    });

    it('NÃO deve rolar quando novas mensagens chegarem se o usuário tiver rolado para cima (estilo WhatsApp)', async () => {
      const scrollSpy = vi.spyOn(component, 'scrollToBottom');
      
      // Usuário subiu o scroll para ler histórico antigo
      component.isNearBottom = false;

      // Adiciona novas mensagens que chegam no chat
      mockChatSignal.set([
        {
          id: '2',
          userNickname: 'Ana',
          userAvatar: '✨',
          text: 'Boa noite a todos!',
          timestamp: Date.now()
        }
      ]);
      fixture.detectChanges();
      TestBed.flushEffects();

      // Como isNearBottom é false, não deve chamar scrollToBottom no effect
      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });
});
