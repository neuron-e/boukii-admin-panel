import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { rentalUiStatus } from '../rental-status.util';

@Component({
  selector: 'app-rental-status-badge',
  templateUrl: './rental-status-badge.component.html',
  styleUrls: ['./rental-status-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RentalStatusBadgeComponent {
  @Input() status: string | null | undefined = null;

  protected readonly rentalUiStatus = rentalUiStatus;
}
