import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaymentTerminalComponent } from './payment-terminal.component';

const routes: Routes = [
  {
    path: '',
    component: PaymentTerminalComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PaymentTerminalRoutingModule { }
