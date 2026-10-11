import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type MobileTab = 'salas' | 'historico' | 'fila' | 'buscar';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mobile-nav.component.html',
  styleUrl: './mobile-nav.component.css'
})
export class MobileNavComponent {
  readonly activeTab = input<MobileTab>('salas');
  readonly tabChange = output<MobileTab>();
}
