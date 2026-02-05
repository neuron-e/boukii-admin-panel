import { Component, ContentChild, TemplateRef } from '@angular/core';

@Component({
  selector: 'vex-flux-layout',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class FluxLayoutComponent {
  ShowCard: boolean = false;
  showSidebar: boolean = true;

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }
}

