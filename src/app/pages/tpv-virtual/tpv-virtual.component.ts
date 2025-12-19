import { Component, OnInit } from '@angular/core';
import { ApiCrudService } from 'src/service/crud.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'vex-tpv-virtual',
  templateUrl: './tpv-virtual.component.html',
  styleUrls: ['./tpv-virtual.component.scss']
})
export class TpvVirtualComponent implements OnInit {
  loading = false;

  constructor(
    private crudService: ApiCrudService,
    private snackBar: MatSnackBar,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.openVPOS();
  }

  async openVPOS(): Promise<void> {
    this.loading = true;

    try {
      const response: any = await this.crudService.get('/admin/payment-terminal/vpos-url').toPromise();

      if (response && response.vpos_url) {
        window.open(response.vpos_url, '_blank');
        this.snackBar.open(
          this.translateService.instant('tpv_virtual.opened'),
          'OK',
          { duration: 3000 }
        );
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error opening VPOS:', error);
      this.snackBar.open(
        this.translateService.instant('tpv_virtual.error'),
        'OK',
        { duration: 5000 }
      );
    } finally {
      this.loading = false;
    }
  }
}
