import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { VexRoutes } from "src/@vex/interfaces/vex-route.interface";
import { BookingsComponent } from "./bookings.component";
import { BookingsCreateUpdateComponent } from "./bookings-create-update/bookings-create-update.component";
import { BookingDetailComponent } from "./booking-detail/booking-detail.component";
import { BookingsCreateUpdateEditComponent } from "./bookings-create-update-edit/bookings-create-update-edit.component";

const routes: VexRoutes = [
  {
    path: "",
    component: BookingsComponent,
    data: {
      toolbarShadowEnabled: true,
    },
  },
  {
    path: "create",
    component: BookingsCreateUpdateComponent,
    data: {
      toolbarShadowEnabled: true,
    },
  },
  {
    path: "update/:id",
    component: BookingDetailComponent,
    data: {
      toolbarShadowEnabled: true,
    },
  },
  {
    path: "edit/:id",
    component: BookingsCreateUpdateEditComponent,
    data: {
      toolbarShadowEnabled: true,
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BookingsRoutingModule { }
