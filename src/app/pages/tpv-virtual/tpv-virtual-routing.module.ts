import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TpvVirtualComponent } from './tpv-virtual.component';

const routes: Routes = [
  {
    path: '',
    component: TpvVirtualComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TpvVirtualRoutingModule { }
