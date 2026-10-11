import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  activeTab = 'inicio';
  tabSelected = output<string>();

  selectTab(tab: string): void {
    this.activeTab = tab;
    this.tabSelected.emit(tab);
  }
}
