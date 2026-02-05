import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ApiCrudService } from 'src/service/crud.service';

@Component({
  selector: 'vex-confirm-dialog-edit-booking',
  templateUrl: './confirm-dialog-edit-booking.component.html',
  styleUrls: ['./confirm-dialog-edit-booking.component.scss']
})
export class ConfirmModalEditBookingComponent implements OnInit {


  constructor(@Inject(MAT_DIALOG_DATA) public defaults: any, private router: Router) {

  }

  ngOnInit(): void {
  }

  goTo() {
    this.router.navigate([this.defaults.route])
  }

}
