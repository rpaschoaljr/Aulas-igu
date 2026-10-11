import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockWebSocketService } from '../../core/websocket/mock-websocket.service';

@Component({
  selector: 'app-search-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-history.component.html',
  styleUrl: './search-history.component.css'
})
export class SearchHistoryComponent {
  readonly mockWs = inject(MockWebSocketService);
}
