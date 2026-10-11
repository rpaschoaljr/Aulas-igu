import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveStationComponent } from './active-station.component';
import { RadioStateService } from '../../core/radio/radio-state.service';

describe('ActiveStationComponent (TDD)', () => {
  let component: ActiveStationComponent;
  let fixture: ComponentFixture<ActiveStationComponent>;
  let radioState: RadioStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveStationComponent],
      providers: [RadioStateService]
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveStationComponent);
    component = fixture.componentInstance;
    radioState = TestBed.inject(RadioStateService);
    fixture.detectChanges();
  });

  it('deve ser criado com sucesso', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir o indicador de SINTONIZADO AO VIVO e nome da sala ativa', () => {
    radioState.activeRoom.set('Radio Six-Nine');
    radioState.setListenersCount(12);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('SINTONIZADO AO VIVO');
    expect(compiled.textContent).toContain('Radio Six-Nine');
    expect(compiled.textContent).toContain('12');
    expect(compiled.textContent).toContain('ouvintes conectados');
  });
});
