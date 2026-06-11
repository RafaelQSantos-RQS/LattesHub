import { Component, inject, signal } from '@angular/core';
type FilterState = 'loading' | 'error' | 'empty' | 'success';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FilterAreaOption, FilterInstitution, ProductionTypeOption, SearchService } from '../../services/search';

interface SidebarSections {
  institution: boolean;
  researchArea: boolean;
  productionType: boolean;
  yearRange: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly searchService = inject(SearchService);

  expandedSections = signal<SidebarSections>({
    institution: true,
    researchArea: true,
    productionType: true,
    yearRange: true
  });
  institutions = signal<FilterInstitution[]>([]);
  institutionsState = signal<FilterState>('loading');
  areaOptions = signal<FilterAreaOption[]>([]);
  areasState = signal<FilterState>('loading');
  productionTypes = signal<ProductionTypeOption[]>([]);
  productionTypesState = signal<FilterState>('loading');
  selectedInstitutionId = signal<number | undefined>(undefined);
  selectedType = signal<string | undefined>(undefined);
  selectedYear = signal<number | undefined>(undefined);
  selectedYearStart = signal<number | undefined>(undefined);
  selectedYearEnd = signal<number | undefined>(undefined);
  selectedAreas = signal<number[]>([]);

  constructor() {
    this.searchService.getInstitutions()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: institutions => {
          this.institutions.set(institutions);
          this.institutionsState.set(institutions.length === 0 ? 'empty' : 'success');
        },
        error: () => this.institutionsState.set('error'),
      });

    this.searchService.getAreaOptions()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: areas => {
          this.areaOptions.set(areas);
          this.areasState.set(areas.length === 0 ? 'empty' : 'success');
        },
        error: () => this.areasState.set('error'),
      });

    this.searchService.getProductionTypes()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: productionTypes => {
          this.productionTypes.set(productionTypes);
          this.productionTypesState.set(productionTypes.length === 0 ? 'empty' : 'success');
        },
        error: () => this.productionTypesState.set('error'),
      });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe(params => {
        this.selectedInstitutionId.set(this.toNumber(params.get('instituicao_id')));
        this.selectedType.set(params.get('tipo_producao') ?? undefined);
        this.selectedYear.set(this.toNumber(params.get('ano')));
        this.selectedYearStart.set(this.toNumber(params.get('ano_inicio')));
        this.selectedYearEnd.set(this.toNumber(params.get('ano_fim')));
        this.selectedAreas.set(params.getAll('areas').map(Number).filter(Number.isFinite));
      });
  }

  toggleSection(section: keyof SidebarSections) {
    this.expandedSections.update(sections => ({
      ...sections,
      [section]: !sections[section]
    }));
  }

  onInstitutionChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.updateQueryParams({ instituicao_id: value || null });
  }

  onTypeChange(tipoProducao: string) {
    this.updateQueryParams({
      tipo_producao: this.selectedType() === tipoProducao ? null : tipoProducao,
    });
  }

  onAreaToggle(areaId: number, checked: boolean) {
    const selected = new Set(this.selectedAreas());

    if (checked) {
      selected.add(areaId);
    } else {
      selected.delete(areaId);
    }

    this.updateQueryParams({ areas: Array.from(selected) });
  }

  onYearInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.updateQueryParams({ ano: value || null });
  }

  onYearStartInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.updateQueryParams({ ano_inicio: value || null, ano: null });
  }

  onYearEndInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.updateQueryParams({ ano_fim: value || null, ano: null });
  }

  clearFilters() {
    this.updateQueryParams({
      instituicao_id: null,
      tipo_producao: null,
      ano: null,
      ano_inicio: null,
      ano_fim: null,
      areas: null,
    });
  }

  productionTypeIcon(tipoProducao: string) {
    if (tipoProducao.includes('EVENTO')) {
      return 'event';
    }

    if (tipoProducao.includes('LIVRO')) {
      return 'menu_book';
    }

    return 'description';
  }

  private updateQueryParams(queryParams: Record<string, string | number[] | null>) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  private toNumber(value: string | null) {
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
