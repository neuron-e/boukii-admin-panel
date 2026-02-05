import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

@Component({
  selector: 'vex-school-info-tab',
  templateUrl: './school-info-tab.component.html',
  styleUrls: ['./school-info-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchoolInfoTabComponent {
  @Input() form: FormGroup;
  @Input() myControlCountries: FormControl;
  @Input() myControlProvinces: FormControl;
  @Input() filteredCountries: Observable<any[]>;
  @Input() filteredProvinces: Observable<any[]>;
  @Input() logoPreview: string | null = null;

  @Output() save = new EventEmitter<void>();
  @Output() logoUpload = new EventEmitter<string>();
  @Output() logoFile = new EventEmitter<File>();
  @Output() countrySelected = new EventEmitter<MatAutocompleteSelectedEvent>();
  @Output() provinceSelected = new EventEmitter<MatAutocompleteSelectedEvent>();

  showLogoLink(): boolean {
    return !!this.logoPreview && !this.logoPreview.startsWith('data:');
  }

  displayCountry(option: any): string {
    return option && option.name ? option.name : '';
  }

  displayProvince(option: any): string {
    return option && option.name ? option.name : '';
  }
}
