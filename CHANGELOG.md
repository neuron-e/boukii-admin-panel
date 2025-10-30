# Changelog

All notable changes to the Boukii Admin Panel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Gift Vouchers**: Added card/table view toggle for gift vouchers with mat-button-toggle-group
  - Card view displays vouchers as styled gradient cards
  - Table view provides compact, sortable data display
  - View preference persists during session

- **Course Intervals**: Added tab navigation for subgroups with multiple intervals
  - Tabs appear automatically when a subgroup spans multiple course intervals
  - Each tab displays only the dates for that specific interval
  - Reduces horizontal scrolling in availability grid
  - Improved interval detection with multiple property name fallbacks
  - Improves UX for courses with many weeks/intervals
  - Debug logging for troubleshooting interval detection

- **Legend Sidebar**: Implemented collapsible sidebar for course detail legend
  - Close button in sidebar header (chevron_right icon)
  - Floating reopen button when collapsed (chevron_left icon)
  - Smooth transitions and responsive design
  - Provides more space for main course content

- **Discount Codes**: Added "nombre" (name) field to discount codes table
  - Allows better identification and organization of discount codes
  - Removed from gift vouchers where it was not needed

### Changed
- **Analytics Export**: Monitor detail CSV export now uses selected language instead of hardcoded Spanish
  - All export headers and labels are now translated dynamically
  - Supports: es, en, fr, de, it

- **Analytics Translations**: Completed translation of all hardcoded Spanish text in Analytics module
  - Added 41 new translation keys for monitor analysis page
  - Covers: loading states, KPIs, charts, tables, filters, detail views
  - All UI text now respects user's selected language

- **Availability Grid**: Optimized for better space utilization and readability
  - Font-size reduced from 12px to 10px for compact display
  - Date format changed to 'dd/MM/yy' with year for better context
  - Column width reduced from 90px to 60-70px (saves ~30% horizontal space)
  - Table layout changed from fixed to auto for flexible sizing
  - Date dropdowns use 'dd/MM/yy' format consistently
  - Improves readability on smaller screens and reduces horizontal scrolling

- **Course Layout**: Maximized screen space utilization
  - Removed restrictive max-width (1100px) on main content area
  - Content now uses flex layout to fill available horizontal space
  - Maintains 30px margins for comfortable viewing
  - Sidebar width reduced to 380px for better balance
  - When sidebar collapses, content expands to fill entire width

### Fixed
- **Monitor Export Language**: Fixed issue where monitor CSV exports were always in Spanish regardless of selected language
- **Analytics UI**: Fixed untranslated text appearing in Spanish throughout the Analytics components
- **Sidebar Reopen Button**: Fixed floating reopen button not appearing when sidebar is collapsed
- **Template Syntax**: Fixed Angular build errors caused by arrow functions in templates
- **Duplicate Functions**: Removed duplicate `onIntervalTabChange` method that caused compilation errors

### Technical
- **Components Modified**:
  - `src/@vex/components/flux-component/flux-disponibilidad/` - Added interval filtering support
  - `src/@vex/components/flux-component/flux-layout/` - Added sidebar collapse functionality
  - `src/app/pages/courses-v2/courses-create-update/` - Added interval tabs logic
  - `src/app/pages/bonuses/` - Added view toggle for gift vouchers
  - `src/app/pages/analytics-v2/monitors-legacy/` - Added translation support

- **Translation Files**: Added 49 new translation keys across 5 languages (es, en, fr, de, it)
  - Monitor export translations (14 keys)
  - Analytics page translations (27 keys)
  - Gift voucher view translations (8 keys)

---

## [15.0.0] - Previous Release
- Base version for this changelog
