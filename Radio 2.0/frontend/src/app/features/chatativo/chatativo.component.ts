import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RealWebSocketService } from '../../core/websocket/real-websocket.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-chatativo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatativo.component.html',
  styleUrl: './chatativo.component.css'
})
export class ChatativoComponent {
  private readonly realWs = inject(RealWebSocketService);
  private readonly authService = inject(AuthService);

  readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  readonly chatMessages = this.realWs.chatMessages;
  readonly newMessage = signal('');

  // Flag que rastreia se o usuário está acompanhando o rodapé (estilo WhatsApp)
  isNearBottom = true;

  constructor() {
    effect(() => {
      // Reage à adição de novas mensagens na fila do WebSocket
      this.chatMessages();
      if (this.isNearBottom) {
        this.scrollToBottom();
      }
    });
  }

  isEmoji(avatar?: string): boolean {
    if (!avatar) return true;
    return !avatar.startsWith('http://') && !avatar.startsWith('https://') && !avatar.startsWith('/assets/');
  }

  isMyMessage(authorNickname: string): boolean {
    const user = this.authService.currentUser();
    return user ? user.nickname === authorNickname : authorNickname === 'Você';
  }

  onScroll(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (!el) return;

    // Se o usuário estiver a menos de 60px do rodapé, consideramos que ele quer continuar acompanhando
    const threshold = 60;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.isNearBottom = distanceToBottom <= threshold;
  }

  scrollToBottom(force = false): void {
    setTimeout(() => {
      const el = this.scrollContainer()?.nativeElement;
      if (!el) return;

      if (force || this.isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }, 0);
  }

  sendMessage(event: Event): void {
    event.preventDefault();
    const text = this.newMessage().trim();
    if (!text) return;

    const user = this.authService.currentUser();
    const nick = user ? user.nickname : 'Ouvinte Convidado';
    const avatar = user ? user.avatarUrl : '🎧';

    this.realWs.sendChatMessage(nick, avatar, text);
    this.newMessage.set('');

    // Ao enviar mensagem própria, forçamos o scroll para o fim e reativamos o modo de acompanhamento
    this.isNearBottom = true;
    this.scrollToBottom(true);
  }
}
