import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-form-button',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class ComponenteButtonComponent {
  @Input() form: "stroked" | "flat" | "back" = "stroked"
  @Input() disabled: boolean = false
  @Input() icon: string = ""
  @Input() name: string = ""
  @Input() loading: boolean = false
}
