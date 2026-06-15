import { Component, HostListener, computed, inject, signal } from '@angular/core';
type FilterState = 'loading' | 'error' | 'empty' | 'success';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FilterAreaOption, FilterInstitution, ProductionTypeOption, SearchService } from '../../services/search';
import { TranslatePipe } from '../../i18n/translate.pipe';

interface SidebarSections {
  institution: boolean;
  researchArea: boolean;
  productionType: boolean;
  yearRange: boolean;
  qualis: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [TranslatePipe],
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
    yearRange: true,
    qualis: true,
  });
  readonly qualisOptions = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'C', 'Sem Qualis'];
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
  selectedQualis = signal<string | undefined>(undefined);
  showInstDropdown = signal(false);
  instSearchQuery = signal('');
  showQualisDropdown = signal(false);
  qualisSearchQuery = signal('');
  selectedInstitutionName = computed(() => (
    this.institutions().find(institution => institution.id === this.selectedInstitutionId())?.nome ?? ''
  ));
  filteredInstitutions = computed(() => {
    const query = this.instSearchQuery().trim().toLowerCase();
    if (!query) {
      return this.institutions();
    }

    return this.institutions().filter(institution =>
      institution.nome.toLowerCase().includes(query),
    );
  });
  filteredQualis = computed(() => {
    const query = this.qualisSearchQuery().trim().toLowerCase();
    if (!query) {
      return this.qualisOptions;
    }

    return this.qualisOptions.filter(option => option.toLowerCase().includes(query));
  });
  areaSearchQuery = signal('');
  filteredAreaOptions = computed(() => {
    const query = this.areaSearchQuery().toLowerCase().trim();
    if (!query) {
      return this.areaOptions();
    }
    return this.areaOptions().filter(area =>
      area.label.toLowerCase().includes(query) ||
      area.group.toLowerCase().includes(query)
    );
  });

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
        this.selectedQualis.set(params.get('qualis_estrato') ?? undefined);
      });
  }

  @HostListener('document:click', ['$event'])
  closeDropdownsOnOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-filter-combobox]')) {
      return;
    }

    this.showInstDropdown.set(false);
    this.showQualisDropdown.set(false);
  }

  toggleSection(section: keyof SidebarSections) {
    this.expandedSections.update(sections => ({
      ...sections,
      [section]: !sections[section]
    }));
  }

  openInstitutionDropdown() {
    this.instSearchQuery.set('');
    this.showInstDropdown.set(true);
  }

  onInstitutionSearch(event: Event) {
    this.instSearchQuery.set((event.target as HTMLInputElement).value);
    this.showInstDropdown.set(true);
  }

  selectInstitution(institution?: FilterInstitution) {
    this.instSearchQuery.set(institution?.nome ?? '');
    this.showInstDropdown.set(false);
    this.updateQueryParams({ instituicao_id: institution ? String(institution.id) : null });
  }

  openQualisDropdown() {
    this.qualisSearchQuery.set('');
    this.showQualisDropdown.set(true);
  }

  onQualisSearch(event: Event) {
    this.qualisSearchQuery.set((event.target as HTMLInputElement).value);
    this.showQualisDropdown.set(true);
  }

  selectQualis(qualis?: string) {
    this.qualisSearchQuery.set(qualis ?? '');
    this.showQualisDropdown.set(false);
    this.updateQueryParams({ qualis_estrato: qualis ?? null });
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
      qualis_estrato: null,
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
