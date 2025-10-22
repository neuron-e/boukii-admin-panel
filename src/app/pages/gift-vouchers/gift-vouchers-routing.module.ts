import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { VexRoutes } from 'src/@vex/interfaces/vex-route.interface';
import { GiftVouchersComponent } from './gift-vouchers.component';
import { GiftVouchersCreateUpdateComponent } from './gift-vouchers-create-update/gift-vouchers-create-update.component';

const routes: VexRoutes = [
  {
    path: '',
    component: GiftVouchersComponent,
    data: {
      toolbarShadowEnabled: true
    }
  },
  {
    path: 'create',
    component: GiftVouchersCreateUpdateComponent,
    data: {
      toolbarShadowEnabled: true
    }
  },
  {
    path: 'update/:id',
    component: GiftVouchersCreateUpdateComponent,
    data: {
      toolbarShadowEnabled: true
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GiftVouchersRoutingModule {
}
