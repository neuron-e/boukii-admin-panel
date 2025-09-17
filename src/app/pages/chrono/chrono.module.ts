import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Translate
import { TranslateModule } from '@ngx-translate/core';

// Components
import { ChronoComponent } from './chrono.component';

// Routes
const routes = [
  {
    path: '',
    component: ChronoComponent,
    data: { title: 'Cronometraje' }
  }
];

@NgModule({
  declarations: [
    ChronoComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    
    // Angular Material
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    
    // Translate
    TranslateModule
  ],
  exports: [
    ChronoComponent
  ]
})
export class ChronoModule { }