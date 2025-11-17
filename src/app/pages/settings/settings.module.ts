import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutModule } from '../../../@vex/layout/layout.module';
import { PageLayoutModule } from 'src/@vex/components/page-layout/page-layout.module';
import { BreadcrumbsModule } from 'src/@vex/components/breadcrumbs/breadcrumbs.module';
import { RouterModule } from '@angular/router';
import { SecondaryToolbarModule } from 'src/@vex/components/secondary-toolbar/secondary-toolbar.module';
import { MatIconModule } from '@angular/material/icon';
import { WidgetLargeGoalChartModule } from 'src/@vex/components/widgets/widget-large-goal-chart/widget-large-goal-chart.module';
import { WidgetQuickValueStartModule } from 'src/@vex/components/widgets/widget-quick-value-start/widget-quick-value-start.module';
import { WidgetQuickValueCenterModule } from 'src/@vex/components/widgets/widget-quick-value-center/widget-quick-value-center.module';
import { WidgetQuickLineChartModule } from 'src/@vex/components/widgets/widget-quick-line-chart/widget-quick-line-chart.module';
import { ChartModule } from 'src/@vex/components/chart/chart.module';
import { WidgetAssistantModule } from 'src/@vex/components/widgets/widget-assistant/widget-assistant.module';
import { WidgetLargeChartModule } from 'src/@vex/components/widgets/widget-large-chart/widget-large-chart.module';
import { WidgetTableModule } from 'src/@vex/components/widgets/widget-table/widget-table.module';
import { ComponentsModule } from 'src/@vex/components/components.module';
import { MatDialogModule } from '@angular/material/dialog';
import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';
import { SchoolInfoTabComponent } from './tabs/school-info/school-info-tab.component';
import { MatTabsModule } from '@angular/material/tabs';
import { SalaryCreateUpdateModalModule } from './salary-create-update-modal/salary-create-update-modal.module';
import { WidgetClientsSportsNoSwiperModule } from 'src/@vex/components/widgets/widget-clients-sports-no-swiper/widget-clients-sports-no-swiper.module';
import { WidgetSportsLevelModule } from 'src/@vex/components/widgets/widget-sports-level/widget-sports-level.module';
import { LevelSportUpdateModalModule } from './level-sport-update-modal/level-sport-update-modal.module';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { ExtraCreateUpdateModalModule } from './extra-create-update-modal/extra-create-update-modal.module';
import { LevelGoalsModalModule } from './level-goals-modal/level-goals-modal.module';
import { MeetingPointCreateUpdateModalModule } from './meeting-point-create-update-modal/meeting-point-create-update-modal.module';
import { TranslateModule } from '@ngx-translate/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ComponentsCustomModule } from '../../components/components-custom.module';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { ComponenteButtonModule } from "../../../@vex/components/form/button/app.module";
import { FluxUploadImgModule } from 'src/@vex/components/form/upload-img/app.module';
import { FluxModalModule } from "../../../@vex/components/flux-component/flux-modal/app.module";
import { ComponenteEditorModule } from "../../../@vex/components/form/editor/app.module";
import { ComponenteInputModule } from 'src/@vex/components/form/input/app.module';
@NgModule({
    declarations: [SettingsComponent, SchoolInfoTabComponent],
    imports: [
        CommonModule,
        LayoutModule,
        FormsModule,
        ReactiveFormsModule,
        PageLayoutModule,
        BreadcrumbsModule,
        RouterModule,
        SettingsRoutingModule,
        SecondaryToolbarModule,
        MatIconModule,
        ChartModule,
        MatProgressSpinnerModule,
        WidgetQuickLineChartModule,
        WidgetQuickValueCenterModule,
        WidgetQuickValueStartModule,
        WidgetLargeGoalChartModule,
        WidgetAssistantModule,
        WidgetLargeChartModule,
        WidgetTableModule,
        MatTabsModule,
        MatDialogModule,
        ComponentsModule,
        SalaryCreateUpdateModalModule,
        ExtraCreateUpdateModalModule,
        LevelGoalsModalModule,
        MeetingPointCreateUpdateModalModule,
        WidgetClientsSportsNoSwiperModule,
        WidgetSportsLevelModule,
        LevelSportUpdateModalModule,
        MatFormFieldModule,
        MatInputModule,
        MatTableModule,
        MatCardModule,
        MatDatepickerModule,
        MatAutocompleteModule,
        MatSlideToggleModule,
        MatCheckboxModule,
        MatSelectModule,
        MatRadioModule,
        TranslateModule,
        MatButtonModule,
        MatTooltipModule,
        AngularEditorModule,
        ComponentsCustomModule,
        ComponenteButtonModule,
        FluxUploadImgModule,
        FluxModalModule,
        ComponenteEditorModule,
        ComponenteInputModule
    ]
})
export class SettingsModule {
}
