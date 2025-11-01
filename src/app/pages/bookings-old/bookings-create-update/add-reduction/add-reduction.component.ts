import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'booking-add-reduction',
  templateUrl: './add-reduction.component.html',
  styleUrls: ['./add-reduction.component.scss']
})
export class AddReductionModalComponent implements OnInit {

  type = 1;
  discount = 0;
  form: UntypedFormGroup;
  constructor(@Inject(MAT_DIALOG_DATA) public defaults: any, private fb: UntypedFormBuilder) {

  }

  ngOnInit(): void {
    this.form = this.fb.group({
      discount: [0, Validators.required]
    })
  }

}
