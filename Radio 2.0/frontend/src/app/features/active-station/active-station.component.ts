import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioStateService } from '../../core/radio/radio-state.service';

@Component({
  selector: 'app-active-station',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-station.component.html',
  styleUrl: './active-station.component.css'
})
export class ActiveStationComponent {
  readonly radioState = inject(RadioStateService);
}
