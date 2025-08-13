# 🎨 PANTALLAS Y DISEÑO V5 - INVENTARIO COMPLETO

## 🏗️ ARQUITECTURA DE PANTALLAS

### **📋 ESTRUCTURA MODULAR - 14 MÓDULOS IDENTIFICADOS**

```
V5 Design System
├── 🎯 CORE LAYOUTS (5 pantallas base)
├── 🔐 AUTH MODULE (6 pantallas)  
├── 🏫 SEASONS MODULE (8 pantallas) - ⭐ NUEVO
├── 🏢 SCHOOLS MODULE (4 pantallas refactorizadas)
├── 🎿 COURSES MODULE (12 pantallas rediseñadas)
├── 📋 BOOKINGS MODULE (15 pantallas revolucionadas)
├── 👥 CLIENTS MODULE (8 pantallas adaptadas)
├── 👩‍🏫 MONITORS MODULE (10 pantallas season-aware)
├── 💰 SALARIES MODULE (6 pantallas) - ⭐ NUEVO
├── 🎒 RENTAL MODULE (18 pantallas) - ⭐ NUEVO NEGOCIO
├── 📊 ANALYTICS MODULE (12 pantallas mejoradas)
├── ⚙️ SETTINGS MODULE (8 pantallas)
├── 🌤️ WEATHER MODULE (3 pantallas sin cambios)
└── 📱 MOBILE SPECIFIC (20+ pantallas adicionales)

TOTAL: ~135 pantallas únicas + variaciones responsive
```

---

## 🎯 PANTALLAS CORE (5 pantallas fundamentales)

### **1. Layouts Base**
```typescript
// Pantallas estructurales que afectan toda la aplicación
📱 V5LayoutComponent
  ├── 🖥️ Desktop: Header + Sidebar + Main content + Season selector
  ├── 📱 Tablet: Collapsible sidebar + header compacto  
  ├── 📱 Mobile: Bottom nav + hamburger menu

📱 AuthLayoutComponent
  ├── 🖥️ Desktop: Split screen con branding
  ├── 📱 Mobile: Full screen con logo centrado

📱 PublicLayoutComponent (iframe bookings)
  ├── 🖥️ Desktop: Minimal layout para embeds
  ├── 📱 Mobile: Responsive booking flow

📱 ErrorLayoutComponent
  ├── 🖥️ 404, 500, maintenance pages
  ├── 📱 Mobile: Error states responsive

📱 LoadingLayoutComponent  
  ├── 🖥️ Skeleton screens por módulo
  ├── 📱 Mobile: Loading states adaptive
```

---

## 🔐 AUTH MODULE (6 pantallas)

### **Auth Flows Rediseñados**
```typescript
📱 LoginComponent
  ├── 🖥️ Desktop: Split screen con preview de temporada activa
  ├── 📱 Mobile: Single column con season context visible
  ├── States: normal, loading, error, season-expired, first-time

📱 RegisterComponent
  ├── 🖥️ Desktop: Wizard multi-step con school selection
  ├── 📱 Mobile: Step-by-step flow
  ├── States: school-selection, user-info, permissions, confirmation

📱 ForgotPasswordComponent
  ├── 🖥️ Desktop: Simple form con school context
  ├── 📱 Mobile: Simplified single screen

📱 ResetPasswordComponent
  ├── 🖥️ Desktop: Password requirements visible
  ├── 📱 Mobile: Focus on password fields

📱 ProfileManagementComponent
  ├── 🖥️ Desktop: Tabs con season permissions matrix
  ├── 📱 Mobile: Accordion style sections
  ├── Sections: personal-info, season-roles, preferences, security

📱 TwoFactorSetupComponent
  ├── 🖥️ Desktop: QR code + instructions side by side
  ├── 📱 Mobile: Vertical flow with large QR
```

---

## 🏫 SEASONS MODULE (8 pantallas) - ⭐ NUEVO CRÍTICO

### **Season Management (Admin)**
```typescript
📱 SeasonListComponent
  ├── 🖥️ Desktop: Table con quick stats, bulk actions
  ├── 📱 Mobile: Card layout con swipe actions
  ├── Features: filtering, sorting, bulk activate/deactivate

📱 SeasonFormComponent  
  ├── 🖥️ Desktop: Split form + preview
  ├── 📱 Mobile: Multi-step wizard
  ├── Sections: basic-info, dates, pricing-rules, modules

📱 SeasonDashboardComponent
  ├── 🖥️ Desktop: Full dashboard con widgets drag-n-drop
  ├── 📱 Mobile: Vertical widgets stack
  ├── Widgets: stats, recent-bookings, revenue, alerts

📱 SeasonComparisonComponent
  ├── 🖥️ Desktop: Side-by-side comparison con charts
  ├── 📱 Mobile: Swipeable comparison cards
  ├── Views: financial, courses, bookings, performance

📱 SeasonCloningWizardComponent
  ├── 🖥️ Desktop: Multi-step wizard con data preview
  ├── 📱 Mobile: Step indicator + focused content
  ├── Steps: source-selection, data-mapping, preview, confirmation

📱 SeasonClosureComponent
  ├── 🖥️ Desktop: Checklist + confirmation dialogs
  ├── 📱 Mobile: Single column checklist
  ├── Features: data-validation, snapshot-preview, closure-confirmation

📱 SeasonSelectorComponent (Global)
  ├── 🖥️ Desktop: Dropdown con season stats preview
  ├── 📱 Mobile: Modal selector con search
  ├── Features: quick-switch, favorites, recent-seasons

📱 SeasonAuditComponent
  ├── 🖥️ Desktop: Timeline con filters
  ├── 📱 Mobile: Infinite scroll timeline
  ├── Features: activity-feed, change-tracking, user-actions
```

---

## 🏢 SCHOOLS MODULE (4 pantallas refactorizadas)

### **School Management + Season Context**
```typescript
📱 SchoolDashboardComponent
  ├── 🖥️ Desktop: Multi-season overview con comparisons
  ├── 📱 Mobile: Current season focused
  ├── Features: season-switching, module-status, quick-actions

📱 SchoolConfigurationComponent
  ├── 🖥️ Desktop: Tabs con season-specific settings
  ├── 📱 Mobile: Accordion sections
  ├── Sections: general, modules, seasons, integrations

📱 SchoolModulesManagerComponent
  ├── 🖥️ Desktop: Grid layout con module cards
  ├── 📱 Mobile: List view con toggle switches
  ├── Features: module activation, dependency-warnings, billing

📱 SchoolSeasonSettingsComponent
  ├── 🖥️ Desktop: Form con real-time preview
  ├── 📱 Mobile: Multi-step configuration
  ├── Settings: currencies, languages, business-rules, defaults
```

---

## 🎿 COURSES MODULE (12 pantallas rediseñadas)

### **Course Management Season-Aware**
```typescript
📱 CourseListSeasonComponent
  ├── 🖥️ Desktop: Table + calendar toggle, season filter
  ├── 📱 Mobile: Card layout con season indicator
  ├── Features: season-filtering, bulk-edit, quick-duplicate

📱 CourseFormSeasonComponent
  ├── 🖥️ Desktop: Split layout form + schedule preview
  ├── 📱 Mobile: Multi-step wizard
  ├── Sections: basic-info, schedule, pricing, season-rules

📱 CourseCalendarSeasonComponent
  ├── 🖥️ Desktop: Full calendar con season timeline
  ├── 📱 Mobile: Monthly view con swipe navigation
  ├── Views: month, week, day, season-overview

📱 CoursePricingSeasonComponent
  ├── 🖥️ Desktop: Matrix pricing con season comparison
  ├── 📱 Mobile: Accordion pricing by season
  ├── Features: seasonal-rules, bulk-pricing, pricing-history

📱 CourseGroupManagementComponent
  ├── 🖥️ Desktop: Drag-drop groups con course assignment
  ├── 📱 Mobile: List + modal assignment
  ├── Features: group-hierarchy, course-assignment, capacity

📱 CourseSubgroupManagerComponent
  ├── 🖥️ Desktop: Nested tree view con inline editing
  ├── 📱 Mobile: Breadcrumb navigation
  ├── Features: drag-drop, capacity-management, instructor-assignment

📱 CourseAvailabilityComponent
  ├── 🖥️ Desktop: Calendar + availability matrix
  ├── 📱 Mobile: List view por dates
  ├── Features: real-time-slots, overbooking-warnings, waitlist

📱 CourseReportsComponent
  ├── 🖥️ Desktop: Charts + data tables
  ├── 📱 Mobile: Swipeable chart cards
  ├── Reports: attendance, revenue, capacity, seasonal-comparison

📱 CourseTemplatesComponent
  ├── 🖥️ Desktop: Grid templates con preview
  ├── 📱 Mobile: List templates con quick-actions
  ├── Features: template-creation, season-cloning, customization

📱 CourseDuplicationWizardComponent
  ├── 🖥️ Desktop: Multi-step con data mapping
  ├── 📱 Mobile: Step-by-step wizard
  ├── Steps: source-selection, target-season, customization, confirmation

📱 CourseHistoryComponent
  ├── 🖥️ Desktop: Timeline con season markers
  ├── 📱 Mobile: Chronological list
  ├── Features: version-history, season-comparison, restore-points

📱 CourseAnalyticsSeasonComponent
  ├── 🖥️ Desktop: Dashboard con KPIs por season
  ├── 📱 Mobile: Vertical metrics stack
  ├── Analytics: performance, trends, predictions, recommendations
```

---

## 📋 BOOKINGS MODULE (15 pantallas revolucionadas)

### **Booking System Season-Immutable**
```typescript
📱 BookingListSeasonComponent
  ├── 🖥️ Desktop: Advanced table con season context, filters
  ├── 📱 Mobile: Card layout con swipe actions
  ├── Features: season-filtering, status-filtering, bulk-actions

📱 BookingWizardSeasonComponent
  ├── 🖥️ Desktop: Multi-step sidebar navigation
  ├── 📱 Mobile: Full-screen step flow
  ├── Steps: client-selection, course-selection, pricing-preview, payment, confirmation

📱 BookingDetailSeasonComponent
  ├── 🖥️ Desktop: Comprehensive view con history timeline
  ├── 📱 Mobile: Tabbed detail view
  ├── Sections: info, payments, communications, history, notes

📱 BookingCalendarSeasonComponent
  ├── 🖥️ Desktop: Multi-view calendar con booking overlay
  ├── 📱 Mobile: Month view con booking indicators
  ├── Views: monthly, weekly, daily, resource-view

📱 BookingPricingCalculatorComponent
  ├── 🖥️ Desktop: Calculator + pricing breakdown
  ├── 📱 Mobile: Step calculator
  ├── Features: real-time-calculation, discount-application, voucher-validation

📱 BookingPaymentManagerComponent
  ├── 🖥️ Desktop: Payment timeline + action buttons
  ├── 📱 Mobile: Payment cards con quick actions
  ├── Features: payment-processing, refunds, installments, reminders

📱 BookingCommunicationsComponent
  ├── 🖥️ Desktop: Email timeline + templates
  ├── 📱 Mobile: Message thread view
  ├── Features: email-templates, automated-notifications, manual-messaging

📱 BookingModificationsComponent
  ├── 🖥️ Desktop: Before/after comparison + impact analysis
  ├── 📱 Mobile: Modification wizard
  ├── Features: change-requests, impact-preview, approval-workflow

📱 BookingCancellationComponent
  ├── 🖥️ Desktop: Cancellation rules + refund calculator
  ├── 📱 Mobile: Simple cancellation flow
  ├── Features: cancellation-policies, refund-calculation, fee-assessment

📱 BookingGroupManagerComponent
  ├── 🖥️ Desktop: Group bookings table con participant management
  ├── 📱 Mobile: Group cards con participant list
  ├── Features: group-creation, participant-management, group-pricing

📱 BookingWaitlistComponent
  ├── 🖥️ Desktop: Waitlist queue con auto-assignment rules
  ├── 📱 Mobile: Waitlist cards con notification settings
  ├── Features: queue-management, auto-assignment, notification-system

📱 BookingReportsSeasonComponent
  ├── 🖥️ Desktop: Comprehensive reporting dashboard
  ├── 📱 Mobile: Report cards con drill-down
  ├── Reports: seasonal-comparison, revenue-analysis, occupancy-rates

📱 BookingIframeComponent (Public)
  ├── 🖥️ Desktop: Embeddable booking widget
  ├── 📱 Mobile: Mobile-first booking flow
  ├── Features: white-label, customizable, responsive

📱 BookingCheckInComponent
  ├── 🖥️ Desktop: Check-in interface con QR scanner
  ├── 📱 Mobile: Mobile check-in app
  ├── Features: qr-scanning, attendance-tracking, late-arrivals

📱 BookingAnalyticsComponent
  ├── 🖥️ Desktop: Analytics dashboard con predictive insights
  ├── 📱 Mobile: Key metrics cards
  ├── Analytics: conversion-rates, booking-patterns, revenue-forecasting
```

---

## 👥 CLIENTS MODULE (8 pantallas adaptadas)

### **Client Management Multi-Season**
```typescript
📱 ClientListComponent
  ├── 🖥️ Desktop: Advanced search + filters con season history
  ├── 📱 Mobile: Search-first interface
  ├── Features: season-filtering, activity-tracking, segmentation

📱 ClientDetailSeasonComponent
  ├── 🖥️ Desktop: 360° client view con season timeline
  ├── 📱 Mobile: Tabbed client profile
  ├── Sections: info, bookings-history, payments, communications, preferences

📱 ClientFormComponent
  ├── 🖥️ Desktop: Smart form con auto-completion
  ├── 📱 Mobile: Progressive form
  ├── Features: duplicate-detection, validation, photo-upload

📱 ClientBookingHistoryComponent
  ├── 🖥️ Desktop: Timeline view con season markers
  ├── 📱 Mobile: Chronological cards
  ├── Features: season-filtering, booking-patterns, loyalty-tracking

📱 ClientCommunicationsComponent
  ├── 🖥️ Desktop: Communication timeline + templates
  ├── 📱 Mobile: Message thread
  ├── Features: email-history, sms-integration, notification-preferences

📱 ClientSegmentationComponent
  ├── 🖥️ Desktop: Segmentation builder con filters visuales
  ├── 📱 Mobile: Simple segment creation
  ├── Features: behavior-based-segments, seasonal-patterns, marketing-lists

📱 ClientLoyaltyDashboardComponent
  ├── 🖥️ Desktop: Loyalty metrics + rewards tracking
  ├── 📱 Mobile: Loyalty card view
  ├── Features: points-system, rewards-catalog, tier-management

📱 ClientImportExportComponent
  ├── 🖥️ Desktop: Drag-drop import + mapping wizard
  ├── 📱 Mobile: Simple import form
  ├── Features: csv-import, data-mapping, validation, export-options
```

---

## 👩‍🏫 MONITORS MODULE (10 pantallas season-aware)

### **Monitor/Instructor Management**
```typescript
📱 MonitorListSeasonComponent
  ├── 🖥️ Desktop: Table con availability indicators por season
  ├── 📱 Mobile: Monitor cards con status
  ├── Features: season-filtering, availability-status, skill-filtering

📱 MonitorDetailSeasonComponent
  ├── 🖥️ Desktop: Complete profile con season performance
  ├── 📱 Mobile: Tabbed profile
  ├── Sections: info, availability, assignments, performance, payments

📱 MonitorAvailabilitySeasonComponent
  ├── 🖥️ Desktop: Calendar matrix con availability patterns
  ├── 📱 Mobile: Calendar con simple availability toggle
  ├── Features: recurring-patterns, season-templates, bulk-updates

📱 MonitorAssignmentComponent
  ├── 🖥️ Desktop: Drag-drop assignment board
  ├── 📱 Mobile: Assignment cards con quick actions
  ├── Features: auto-assignment, conflict-detection, workload-balancing

📱 MonitorSalariesSeasonComponent
  ├── 🖥️ Desktop: Salary calculator + payment history
  ├── 📱 Mobile: Salary summary cards
  ├── Features: seasonal-rates, payment-tracking, tax-calculations

📱 MonitorPerformanceComponent
  ├── 🖥️ Desktop: Performance dashboard con KPIs
  ├── 📱 Mobile: Performance cards
  ├── Metrics: client-ratings, attendance, revenue-generated, growth

📱 MonitorScheduleComponent
  ├── 🖥️ Desktop: Weekly schedule con course assignments
  ├── 📱 Mobile: Daily schedule view
  ├── Features: schedule-conflicts, time-tracking, overtime-alerts

📱 MonitorCertificationComponent
  ├── 🖥️ Desktop: Certification tracking + renewal calendar
  ├── 📱 Mobile: Certification cards con status
  ├── Features: expiry-alerts, renewal-tracking, document-upload

📱 MonitorCommunicationComponent
  ├── 🖥️ Desktop: Communication hub con broadcast options
  ├── 📱 Mobile: Simple messaging interface
  ├── Features: group-messaging, announcements, shift-notifications

📱 MonitorAnalyticsComponent
  ├── 🖥️ Desktop: Monitor analytics dashboard
  ├── 📱 Mobile: Key metrics overview
  ├── Analytics: utilization-rates, revenue-per-monitor, seasonal-trends
```

---

## 💰 SALARIES MODULE (6 pantallas) - ⭐ NUEVO

### **Salary Management Season-Aware**
```typescript
📱 SalaryDashboardSeasonComponent
  ├── 🖥️ Desktop: Salary overview con season comparison
  ├── 📱 Mobile: Salary summary cards
  ├── Features: seasonal-totals, pending-payments, tax-summaries

📱 SalaryCalculatorSeasonComponent
  ├── 🖥️ Desktop: Advanced calculator con rules engine
  ├── 📱 Mobile: Simple calculator
  ├── Features: rate-calculation, bonus-calculation, deduction-handling

📱 SalaryPayrollComponent
  ├── 🖥️ Desktop: Payroll processing interface con bulk actions
  ├── 📱 Mobile: Payroll approval workflow
  ├── Features: batch-processing, approval-workflow, payment-integration

📱 SalaryReportsSeasonComponent
  ├── 🖥️ Desktop: Comprehensive salary reports
  ├── 📱 Mobile: Report cards
  ├── Reports: payroll-summary, tax-reports, seasonal-comparison

📱 SalarySettingsSeasonComponent
  ├── 🖥️ Desktop: Settings con season-specific rules
  ├── 📱 Mobile: Settings form
  ├── Settings: pay-rates, bonus-rules, deduction-rules, tax-settings

📱 SalaryHistoryComponent
  ├── 🖥️ Desktop: Payment history con season timeline
  ├── 📱 Mobile: Payment cards
  ├── Features: payment-tracking, season-filtering, export-options
```

---

## 🎒 RENTAL MODULE (18 pantallas) - ⭐ NUEVO NEGOCIO

### **Equipment Rental System**

#### **Inventory Management (6 pantallas)**
```typescript
📱 RentalInventoryListComponent
  ├── 🖥️ Desktop: Advanced inventory table con real-time availability
  ├── 📱 Mobile: Inventory cards con quick status
  ├── Features: category-filtering, availability-status, maintenance-alerts

📱 RentalItemFormComponent
  ├── 🖥️ Desktop: Comprehensive item form con photo upload
  ├── 📱 Mobile: Multi-step item creation
  ├── Sections: basic-info, specifications, pricing, photos, maintenance

📱 RentalCategoryManagerComponent
  ├── 🖥️ Desktop: Category tree con drag-drop organization
  ├── 📱 Mobile: Category list con nested navigation
  ├── Features: category-hierarchy, bulk-categorization, pricing-templates

📱 RentalMaintenanceComponent
  ├── 🖥️ Desktop: Maintenance schedule + history tracking
  ├── 📱 Mobile: Maintenance cards con task lists
  ├── Features: maintenance-scheduling, service-history, cost-tracking

📱 RentalInventoryReportsComponent
  ├── 🖥️ Desktop: Inventory analytics dashboard
  ├── 📱 Mobile: Key inventory metrics
  ├── Reports: utilization-rates, maintenance-costs, depreciation

📱 RentalSeasonPricingComponent
  ├── 🖥️ Desktop: Matrix pricing con seasonal variations
  ├── 📱 Mobile: Pricing wizard
  ├── Features: seasonal-rates, bulk-pricing, pricing-history
```

#### **Booking Management (8 pantallas)**
```typescript
📱 RentalBookingListComponent
  ├── 🖥️ Desktop: Booking table con calendar integration
  ├── 📱 Mobile: Booking cards con status indicators
  ├── Features: date-filtering, status-filtering, conflict-alerts

📱 RentalBookingWizardComponent
  ├── 🖥️ Desktop: Multi-step booking creation
  ├── 📱 Mobile: Progressive booking flow
  ├── Steps: client-selection, item-selection, dates, pricing, confirmation

📱 RentalAvailabilityCalendarComponent
  ├── 🖥️ Desktop: Interactive calendar con item availability
  ├── 📱 Mobile: Monthly calendar con availability indicators
  ├── Features: multi-item-booking, conflict-detection, waitlist-management

📱 RentalCheckoutComponent
  ├── 🖥️ Desktop: POS-style checkout interface
  ├── 📱 Mobile: Mobile checkout flow
  ├── Features: barcode-scanning, payment-processing, receipt-generation

📱 RentalReturnComponent
  ├── 🖥️ Desktop: Return processing con damage assessment
  ├── 📱 Mobile: Simple return workflow
  ├── Features: condition-assessment, late-fees, damage-charges

📱 RentalWaitlistComponent
  ├── 🖥️ Desktop: Waitlist management con auto-assignment
  ├── 📱 Mobile: Waitlist cards
  ├── Features: priority-queuing, auto-notification, availability-alerts

📱 RentalExtensionComponent
  ├── 🖥️ Desktop: Extension request processing
  ├── 📱 Mobile: Simple extension form
  ├── Features: availability-checking, pricing-calculation, approval-workflow

📱 RentalBookingHistoryComponent
  ├── 🖥️ Desktop: Comprehensive booking history
  ├── 📱 Mobile: History timeline
  ├── Features: client-history, item-history, seasonal-patterns
```

#### **Analytics & Reports (4 pantallas)**
```typescript
📱 RentalDashboardComponent
  ├── 🖥️ Desktop: Complete rental analytics dashboard
  ├── 📱 Mobile: Key metrics overview
  ├── Metrics: revenue, utilization, popular-items, seasonal-trends

📱 RentalRevenueAnalysisComponent
  ├── 🖥️ Desktop: Revenue analytics con forecasting
  ├── 📱 Mobile: Revenue cards con trend indicators
  ├── Analytics: seasonal-revenue, item-profitability, pricing-optimization

📱 RentalUtilizationReportsComponent
  ├── 🖥️ Desktop: Utilization tracking + optimization suggestions
  ├── 📱 Mobile: Utilization summary
  ├── Reports: item-utilization, peak-times, capacity-planning

📱 RentalClientAnalysisComponent
  ├── 🖥️ Desktop: Client behavior analysis
  ├── 📱 Mobile: Client insights cards
  ├── Analytics: rental-patterns, loyalty-metrics, upselling-opportunities
```

---

## 📊 ANALYTICS MODULE (12 pantallas mejoradas)

### **Enhanced Analytics with Season Context**
```typescript
📱 AnalyticsDashboardSeasonComponent
  ├── 🖥️ Desktop: Comprehensive dashboard con season comparison
  ├── 📱 Mobile: Key metrics cards
  ├── Features: season-filtering, comparative-analysis, drill-down

📱 RevenueAnalyticsSeasonComponent
  ├── 🖥️ Desktop: Advanced revenue analytics con forecasting
  ├── 📱 Mobile: Revenue trend cards
  ├── Analytics: seasonal-revenue, revenue-streams, profitability

📱 BookingAnalyticsComponent
  ├── 🖥️ Desktop: Booking behavior analysis
  ├── 📱 Mobile: Booking insights
  ├── Analytics: conversion-rates, booking-patterns, cancellation-analysis

📱 ClientAnalyticsSeasonComponent
  ├── 🖥️ Desktop: Client lifetime value + segmentation
  ├── 📱 Mobile: Client metrics
  ├── Analytics: retention-rates, seasonal-behavior, loyalty-analysis

📱 CoursePerformanceAnalyticsComponent
  ├── 🖥️ Desktop: Course optimization insights
  ├── 📱 Mobile: Course metrics
  ├── Analytics: popularity, profitability, capacity-optimization

📱 MonitorPerformanceAnalyticsComponent
  ├── 🖥️ Desktop: Monitor efficiency + workload analysis
  ├── 📱 Mobile: Monitor insights
  ├── Analytics: utilization, performance-ratings, scheduling-optimization

📱 FinancialReportsSeasonComponent
  ├── 🖥️ Desktop: Comprehensive financial reporting
  ├── 📱 Mobile: Financial summary
  ├── Reports: P&L, cash-flow, seasonal-comparison, tax-reports

📱 OperationalAnalyticsComponent
  ├── 🖥️ Desktop: Operational efficiency dashboard
  ├── 📱 Mobile: Operational metrics
  ├── Analytics: capacity-utilization, resource-optimization, workflow-efficiency

📱 PredictiveAnalyticsComponent
  ├── 🖥️ Desktop: AI-powered forecasting + recommendations
  ├── 📱 Mobile: Prediction cards
  ├── Features: demand-forecasting, pricing-optimization, resource-planning

📱 CustomReportBuilderComponent
  ├── 🖥️ Desktop: Drag-drop report builder
  ├── 📱 Mobile: Simple report wizard
  ├── Features: custom-metrics, automated-reports, export-options

📱 RealTimeAnalyticsComponent
  ├── 🖥️ Desktop: Live analytics dashboard
  ├── 📱 Mobile: Live metrics feed
  ├── Features: real-time-bookings, live-revenue, instant-alerts

📱 CompetitiveAnalysisComponent
  ├── 🖥️ Desktop: Market analysis + benchmarking
  ├── 📱 Mobile: Market insights
  ├── Analytics: market-positioning, competitive-pricing, industry-trends
```

---

## ⚙️ SETTINGS MODULE (8 pantallas)

### **System Configuration**
```typescript
📱 GeneralSettingsComponent
  ├── 🖥️ Desktop: Comprehensive settings panel
  ├── 📱 Mobile: Settings categories
  ├── Categories: system, localization, notifications, integrations

📱 UserManagementComponent
  ├── 🖥️ Desktop: User table con role management
  ├── 📱 Mobile: User cards
  ├── Features: role-assignment, permission-matrix, season-access

📱 RolePermissionMatrixComponent
  ├── 🖥️ Desktop: Matrix interface con granular permissions
  ├── 📱 Mobile: Permission lists por role
  ├── Features: custom-roles, permission-inheritance, audit-trail

📱 IntegrationSettingsComponent
  ├── 🖥️ Desktop: Integration hub con API management
  ├── 📱 Mobile: Integration cards
  ├── Integrations: payment-gateways, email-services, SMS, accounting

📱 NotificationSettingsComponent
  ├── 🖥️ Desktop: Notification rules builder
  ├── 📱 Mobile: Notification preferences
  ├── Features: email-templates, SMS-templates, trigger-rules, scheduling

📱 BackupRestoreComponent
  ├── 🖥️ Desktop: Backup management interface
  ├── 📱 Mobile: Backup status cards
  ├── Features: automated-backups, restore-points, data-export

📱 AuditLogComponent
  ├── 🖥️ Desktop: Comprehensive audit trail
  ├── 📱 Mobile: Activity timeline
  ├── Features: user-activity, system-changes, security-events

📱 SystemHealthComponent
  ├── 🖥️ Desktop: System monitoring dashboard
  ├── 📱 Mobile: Health status cards
  ├── Monitoring: performance-metrics, error-tracking, uptime-monitoring
```

---

## 🌤️ WEATHER MODULE (3 pantallas - sin cambios)

### **Weather Integration (Existing)**
```typescript
📱 WeatherDashboardComponent
  ├── 🖥️ Desktop: Weather overview con forecasts
  ├── 📱 Mobile: Current conditions + forecast

📱 WeatherStationManagementComponent
  ├── 🖥️ Desktop: Station configuration
  ├── 📱 Mobile: Station list

📱 WeatherAlertsComponent
  ├── 🖥️ Desktop: Alert management
  ├── 📱 Mobile: Alert notifications
```

---

## 📱 MOBILE SPECIFIC (20+ pantallas adicionales)

### **Mobile-First Experiences**
```typescript
📱 Mobile App Auth Flow (3 pantallas)
  ├── MobileLoginComponent
  ├── MobileFingerprintAuthComponent
  ├── MobileOnboardingComponent

📱 Mobile Booking Flow (5 pantallas)
  ├── MobileBookingSearchComponent
  ├── MobileBookingSelectionComponent
  ├── MobileBookingPaymentComponent
  ├── MobileBookingConfirmationComponent
  ├── MobileBookingTicketComponent

📱 Mobile Monitor App (8 pantallas)
  ├── MonitorMobileLoginComponent
  ├── MonitorMobileDashboardComponent
  ├── MonitorMobileScheduleComponent
  ├── MonitorMobileCheckInComponent
  ├── MonitorMobileClientListComponent
  ├── MonitorMobileNotificationsComponent
  ├── MonitorMobileProfileComponent
  ├── MonitorMobileHelpComponent

📱 Mobile Client App (6 pantallas)
  ├── ClientMobileProfileComponent
  ├── ClientMobileBookingsComponent
  ├── ClientMobilePaymentsComponent
  ├── ClientMobileNotificationsComponent
  ├── ClientMobileRentalComponent
  ├── ClientMobileFeedbackComponent
```

---

## 🎨 DESIGN SYSTEM REQUIREMENTS

### **Components Base (50+ componentes únicos)**
```typescript
// Form Components
- SeasonAwareFormComponent
- DynamicFormBuilderComponent  
- PricingCalculatorComponent
- DateRangePickerSeasonComponent
- FileUploadComponent

// Navigation Components
- SeasonSelectorComponent
- ModularNavigationComponent
- BreadcrumbSeasonComponent
- TabsComponent
- SidebarComponent

// Data Display Components
- DataTableSeasonComponent
- KPICardComponent
- ChartComponent (múltiples tipos)
- TimelineComponent
- CalendarComponent

// Feedback Components
- AlertComponent
- ModalComponent
- ToastNotificationComponent
- LoadingSkeletonComponent
- ProgressIndicatorComponent

// Business-Specific Components
- BookingStatusComponent
- PaymentStatusComponent
- AvailabilityIndicatorComponent
- SeasonBadgeComponent
- ModuleStatusComponent
```

### **Design Tokens Necesarios**
```scss
// Color System (Light/Dark mode)
$colors: (
  primary: (50, 100, 200, ..., 900),
  secondary: (50, 100, 200, ..., 900),
  success: (50, 100, 200, ..., 900),
  warning: (50, 100, 200, ..., 900),
  error: (50, 100, 200, ..., 900),
  neutral: (50, 100, 200, ..., 900)
);

// Typography Scale
$typography: (
  xs: (font-size: 0.75rem, line-height: 1rem),
  sm: (font-size: 0.875rem, line-height: 1.25rem),
  base: (font-size: 1rem, line-height: 1.5rem),
  lg: (font-size: 1.125rem, line-height: 1.75rem),
  xl: (font-size: 1.25rem, line-height: 1.75rem),
  // ... más sizes
);

// Spacing System
$spacing: (
  0: 0,
  1: 0.25rem,
  2: 0.5rem,
  3: 0.75rem,
  4: 1rem,
  // ... hasta 96
);

// Breakpoints
$breakpoints: (
  sm: 640px,
  md: 768px,
  lg: 1024px,
  xl: 1280px,
  2xl: 1536px
);
```

---

## 🚀 IMPLEMENTACIÓN RECOMENDADA

### **Workflow Óptimo:**
```bash
1. 🎨 DISEÑO FIGMA
   ├── Design System completo con tokens
   ├── Componentes base documentados
   ├── Todas las pantallas en 3 breakpoints
   └── Estados: normal, hover, focus, loading, error

2. 📱 TRANSFERENCIA
   ├── Figma Dev Mode access
   ├── Screenshots HD por breakpoint
   ├── SVG exports para iconografía
   └── Design tokens automáticos

3. 🔧 IMPLEMENTACIÓN
   ├── Angular Material + CDK como base
   ├── Design tokens → SCSS variables
   ├── Storybook para component library
   └── Chromatic para visual testing

4. ✅ VALIDACIÓN
   ├── Pixel-perfect matching
   ├── Responsive testing automatizado
   ├── Accessibility compliance (WCAG 2.1 AA)
   └── Performance testing
```

### **Next Steps:**
1. **¿Cuándo tienes el diseño Figma listo?**
2. **¿Prefieres empezar con módulos específicos o design system completo?**
3. **¿Necesitas que defina arquitectura CSS específica (TailwindCSS vs SCSS vs CSS-in-JS)?**

¿Con cuál de estos módulos/pantallas quieres empezar el diseño?
