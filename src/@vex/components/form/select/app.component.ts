import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-form-select',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class ComponenteSelectComponent implements OnInit {
  @Input() control!: string
  @Input() value!: string
  @Input() label!: string
  @Input() type: "number" | "text" | "tel" | "email" = "text"
  @Input() form!: FormGroup
  @Input() required: boolean = false

  @Input() table!: any
  @Input() id!: string
  @Input() name!: string
  @Input() name2!: string


  @Output() do = new EventEmitter()

  ngOnInit(): void {
    if (this.form && this.control) {
      this.required = this.form.get(this.control)?.hasValidator(Validators.required) || false
    }
  }
  
  displayFn = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }

    if (this.id && this.name && this.name2 && Array.isArray(this.table)) {
      const entry = this.table.find((a: any) => a?.[this.id] === value);
      if (entry) {
        const first = entry?.[this.name] ?? '';
        const second = entry?.[this.name2] ?? '';
        const combined = `${first} ${second}`.trim();
        if (combined) {
          return combined;
        }
      }
    }

    if (this.id && this.name && Array.isArray(this.table)) {
      const entry = this.table.find((a: any) => a?.[this.id] === value);
      if (entry && entry?.[this.name]) {
        return entry[this.name];
      }
    }

    if (typeof value === 'object') {
      const first = this.name && value?.[this.name] !== undefined
        ? value[this.name]
        : (value?.first_name ?? value?.name ?? value?.title ?? '');
      const second = this.name2 && value?.[this.name2] !== undefined
        ? value[this.name2]
        : (value?.last_name ?? value?.surname ?? '');
      const combined = `${first} ${second}`.trim();
      if (combined) {
        return combined;
      }
      if (value?.name) {
        return value.name;
      }
      if (value?.full_name) {
        return value.full_name;
      }
    }

    return typeof value === 'string' ? value : String(value ?? '');
  }

}
