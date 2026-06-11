import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Indicators } from './indicators';
import { ExportService } from '../../services/export';

describe('Indicators', () => {
  let component: Indicators;
  let fixture: ComponentFixture<Indicators>;
  const exportServiceStub = {
    downloadProductionsCsv: vi.fn(() => of(undefined)),
  };

  beforeEach(async () => {
    exportServiceStub.downloadProductionsCsv.mockReset();
    exportServiceStub.downloadProductionsCsv.mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [Indicators],
      providers: [
        { provide: ExportService, useValue: exportServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Indicators);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exports the productions CSV', () => {
    component.exportCsv();

    expect(exportServiceStub.downloadProductionsCsv).toHaveBeenCalledWith(
      undefined,
      'latteshub_producoes_indicadores.csv',
    );
    expect(component.exportError()).toBeNull();
    expect(component.exportingCsv()).toBe(false);
  });

  it('shows an export error when download fails', () => {
    exportServiceStub.downloadProductionsCsv.mockReturnValue(
      throwError(() => new Error('download failed')),
    );

    component.exportCsv();

    expect(component.exportingCsv()).toBe(false);
    expect(component.exportError()).toBe('Nao foi possivel exportar o CSV.');
  });
});
