import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RentalsComponent } from './rentals.component';
import { RentalsItemDetailComponent } from './rentals-item-detail.component';
import { RentalsV2Component } from './rentals-v2.component';

const routes: Routes = [
  {
    path: '',
    component: RentalsV2Component
  },
  {
    path: 'item/:variantId',
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
