import { Component, signal } from '@angular/core';

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
  expandedSections = signal<SidebarSections>({
    institution: false,
    researchArea: true,
    productionType: true,
    yearRange: false
  });

  toggleSection(section: keyof SidebarSections) {
    this.expandedSections.update(sections => ({
      ...sections,
      [section]: !sections[section]
    }));
  }
}
