---
name: Academic Clarity
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#42474c'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#73787c'
  outline-variant: '#c3c7cc'
  surface-tint: '#486174'
  primary: '#001725'
  on-primary: '#ffffff'
  primary-container: '#102c3d'
  on-primary-container: '#7a94a8'
  inverse-primary: '#afcae0'
  secondary: '#29628f'
  on-secondary: '#ffffff'
  secondary-container: '#97cbfe'
  on-secondary-container: '#195682'
  tertiary: '#001335'
  on-tertiary: '#ffffff'
  tertiary-container: '#00275c'
  on-tertiary-container: '#4c8dff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cbe6fd'
  primary-fixed-dim: '#afcae0'
  on-primary-fixed: '#001e2e'
  on-primary-fixed-variant: '#304a5c'
  secondary-fixed: '#cee5ff'
  secondary-fixed-dim: '#97cbfe'
  on-secondary-fixed: '#001d32'
  on-secondary-fixed-variant: '#014a75'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  slate-50: '#F8FAFC'
  slate-200: '#E2E8F0'
  slate-800: '#1E293B'
  slate-900: '#0F172A'
  data-teal: '#7DA8A8'
  success-green: '#10B981'
typography:
  display-lg:
    fontFamily: Libre Caslon Text
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Libre Caslon Text
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-sm:
    fontFamily: Libre Caslon Text
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  baseline: 4px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  sidebar-width: 280px
---

## Brand & Style

This design system centers on the concept of **"Intellectual Transparency."** It is designed for researchers, academics, and data scientists who require high information density without cognitive fatigue. The visual identity is institutional and authoritative, yet humanized through refined typography and a spacious, light-filled layout.

The chosen style is **Modern Corporate / Institutional**, leaning heavily into a clean, "Paper-First" aesthetic. It avoids the trendiness of glassmorphism or neomorphism in favor of structural integrity, clear hierarchies, and a utilitarian approach to data visualization. The interface should feel like a premium digital journal—stable, archival, and meticulously organized.

## Colors

The palette is anchored in a professional "Slate" scale to ensure WCAG AA compliance and reduced eye strain during long research sessions.

- **Primary Action (`slate-900`):** Used for high-level interactions, primary navigation, and headers. It provides a deep, grounded anchor for the interface.
- **Secondary / Links (`#004A75`):** Reserved for interactive data points, citations, and secondary buttons.
- **Background (`slate-50`):** An off-white canvas that softens the glare of pure white while maintaining a clean, academic feel.
- **Borders (`slate-200`):** Used extensively for faceted sidebars and card separation to define structure without adding visual noise.
- **Accent Blue (`#3B82F6`):** Used sparingly for focus states and progress indicators.

## Typography

The typography strategy employs a **Dual-System** approach:

1.  **Editorial Serif (`Libre Caslon Text`):** Used for page titles, section headers, and branding elements. This evokes the tradition of scientific journals and provides a human, prestigious touch.
2.  **Systematic Sans (`Inter`):** The workhorse for all UI components, metadata, and body text. It is chosen for its exceptional legibility in data-dense environments.
3.  **Technical Mono (`JetBrains Mono`):** Used specifically for IDs, DOIs, numerical data strings, and code snippets to ensure character distinction.

**Scaling:** On mobile, `display-lg` should scale down to 32px to maintain readability within narrower viewports.

## Layout & Spacing

This design system utilizes a **Fixed-Fluid Hybrid Grid**. Content is centered within a 1440px max-width container to ensure line lengths remain readable on ultra-wide monitors.

- **Faceted Layout:** A 280px fixed-width left sidebar is the standard for filtering and facet navigation.
- **Vertical Rhythm:** A 4px baseline grid ensures consistent spacing between data rows.
- **Mobile Adaptation:** At the 768px breakpoint, the faceted sidebar transforms into a bottom-sheet filter or a hidden drawer to prioritize the data feed.
- **Density:** Use "Compact" spacing for data tables and "Spacious" spacing for article/abstract views.

## Elevation & Depth

To maintain a "paper" aesthetic, elevation is primarily achieved through **Tonal Layers** rather than heavy shadows.

- **Level 0 (Background):** `slate-50` for the main canvas.
- **Level 1 (Cards/Surfaces):** Pure `#FFFFFF` with a 1px solid `slate-200` border.
- **Level 2 (Interaction):** Very subtle, diffused shadow (`0 4px 12px rgba(15, 23, 42, 0.05)`) used only when a card is hovered or an input is focused.
- **Depth Shading:** Use subtle horizontal rules (`hr`) and light gray backgrounds (`slate-100`) to define header areas and footer zones.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a modern touch that feels approachable without losing the precision and "sharpness" expected in a scientific context.

- **Standard Elements:** Inputs, buttons, and small cards use `rounded-sm`.
- **Search Bars:** May use `rounded-lg` (0.5rem) to differentiate global search tools from functional data inputs.
- **Tags/Chips:** Use 100px (full pill) to distinguish them clearly from interactive buttons.

## Components

### Search Fields
Global search should be "Imposable"—large, high-contrast, and centrally positioned in headers. Use a white background with a prominent `slate-900` icon and placeholder text in `Inter`.

### Faceted Sidebar
Use a vertical stack of collapsible sections. Headers should use `label-bold` with a `slate-200` bottom border. Count indicators (e.g., "Biology [124]") should be in `data-label` using a subtle gray.

### Data-Dense Cards
Cards should contain a serif title (`headline-sm`), a metadata row using `body-sm`, and an optional abstract snippet. Footer of the card should house "Quick Actions" (Cite, Save, Share) using secondary blue links.

### Buttons
- **Primary:** `slate-900` background, white text, `rounded-sm`. 
- **Secondary:** Transparent background, `slate-200` border, `slate-800` text.
- **Ghost:** No border/background, used for low-priority actions in tables.

### Chips & Badges
Small, pill-shaped markers for categories or status. Use low-saturation backgrounds (e.g., light teal or light blue) with dark text to ensure contrast without overwhelming the primary data.