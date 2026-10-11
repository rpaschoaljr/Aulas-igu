import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioStateService } from '../../core/radio/radio-state.service';

@Component({
  selector: 'app-radio-rooms',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './radio-rooms.component.html',
  styleUrl: './radio-rooms.component.css'
})
export class RadioRoomsComponent {
  readonly radioState = inject(RadioStateService);

  enterRoom(roomName: string): void {
    this.radioState.activeRoom.set(roomName);
  }
}
