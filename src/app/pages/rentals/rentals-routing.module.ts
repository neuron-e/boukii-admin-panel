import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RentalsComponent } from './rentals.component';
import { RentalsItemDetailComponent } from './rentals-item-detail.component';
import { RentalsReservationEditComponent } from './rentals-reservation-edit.component';
import { RentalsV2Component } from './rentals-v2.component';

const routes: Routes = [
  {
    path: '',
    component: RentalsV2Component
  },
  {
    path: 'booking',
    component: RentalsV2Component
  },
  {
    path: 'list',
    component: RentalsV2Component
  },
  {
    path: 'catalog',
    component: RentalsV2Component
  },
  {
    path: 'reservation/:reservationId/edit',
    component: RentalsReservationEditComponent
  },
  {
    path: 'reservation/create',
    component: RentalsReservationEditComponent
  },
  {
    path: 'item/:itemId',
    component: RentalsItemDetailComponent
  },
  {
    path: 'variant/:variantId',
    component: RentalsItemDetailComponent
  },
  {
    path: 'advanced',
    component: RentalsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RentalsRoutingModule {}
