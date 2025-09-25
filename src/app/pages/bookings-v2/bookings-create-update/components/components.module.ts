import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";
import { CommonModule } from "@angular/common";

import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatCardModule } from "@angular/material/card";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatRadioModule } from "@angular/material/radio";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { BookingFormStepper } from "./form-stepper/form-stepper.component";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatSelectModule } from "@angular/material/select";
import { MatTabsModule } from "@angular/material/tabs";

import { StepOneComponent } from "./step-one/step-one.component";
import { StepTwoComponent } from "./step-two/step-two.component";
import { StepThreeComponent } from "./step-three/step-three.component";
import { StepFourComponent } from "./step-four/step-four.component";
import { StepDetailsComponent } from "./step-details/step-details.component";
import { StepObservationsComponent } from "./step-observations/step-observations.component";

import { BookingDescriptionCard } from "./booking-description-card/booking-description-card.component";
import { BookingDialogComponent } from "./booking-dialog/booking-dialog.component";
import { CreateUserDialogComponent } from "./create-user-dialog/create-user-dialog.component";
import { CustomHeader } from "./calendar/custom-header/custom-header.component";
import { FormDetailsPrivateComponent } from "./form-details-private/form-details-private.component";

import { FormDetailsColectiveFixComponent } from "./form-details-colective-fix/form-details-colective-fix.component";
import { FormDetailsColectiveFlexComponent } from "./form-details-colective-flex/form-details-colective-flex.component";
import { FormDetailsActivityComponent } from './form-details-activity/form-details-activity.component';
import { BookingReservationDetailComponent } from './booking-reservation-detail/booking-reservation-detail.component';
import { AddReductionModalComponent } from './add-reduction/add-reduction.component';
import { AddDiscountBonusModalComponent } from './add-discount-bonus/add-discount-bonus.component';
import { MatDividerModule } from '@angular/material/divider';
import {ComponentsCustomModule} from '../../../../components/components-custom.module';
import {CdkFixedSizeVirtualScroll, CdkVirtualForOf, CdkVirtualScrollViewport} from '@angular/cdk/scrolling';
import {IconComponent} from '../../../../../@vex/components/icon/app.component';
import { ComponenteButtonModule } from "../../../../../@vex/components/form/button/app.module";
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatFormFieldModule} from '@angular/material/form-field';
import { ClientParticipantConflictDialogComponent } from './client-participant-conflict-dialog/client-participant-conflict-dialog.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatIconModule,
        MatInputModule,
        MatAutocompleteModule,
        MatButtonModule,
        MatCardModule,
        MatCheckboxModule,
        MatRadioModule,
        TranslateModule,
        MatDialogModule,
        MatDatepickerModule,
        MatSelectModule,
        MatTabsModule,
        MatDividerModule,
        ComponentsCustomModule,
        CdkVirtualScrollViewport,
        CdkFixedSizeVirtualScroll,
        CdkVirtualForOf,
        IconComponent,
        ComponenteButtonModule,
        MatProgressSpinnerModule,
        MatProgressBarModule,
        MatFormFieldModule
    ],
    declarations: [
        BookingFormStepper,
        StepOneComponent,
        StepTwoComponent,
        StepThreeComponent,
        BookingDescriptionCard,
        BookingDialogComponent,
        StepFourComponent,
        CustomHeader,
        StepDetailsComponent,
        FormDetailsPrivateComponent,
        StepObservationsComponent,
        FormDetailsColectiveFixComponent,
        FormDetailsColectiveFlexComponent,
        CreateUserDialogComponent,
        FormDetailsActivityComponent,
        BookingReservationDetailComponent,
        AddReductionModalComponent,
        AddDiscountBonusModalComponent,
        BookingReservationDetailComponent,
        ClientParticipantConflictDialogComponent,
    ],
    exports: [
        BookingFormStepper,
        StepOneComponent,
        StepTwoComponent,
        StepThreeComponent,
        BookingDescriptionCard,
        BookingDialogComponent,
        StepFourComponent,
        CustomHeader,
        StepDetailsComponent,
        FormDetailsPrivateComponent,
        StepObservationsComponent,
        FormDetailsColectiveFixComponent,
        FormDetailsColectiveFlexComponent,
        CreateUserDialogComponent,
        BookingReservationDetailComponent,
        AddReductionModalComponent,
        AddDiscountBonusModalComponent,
        BookingReservationDetailComponent
    ],
})
export class BookingComponentsModule { }
