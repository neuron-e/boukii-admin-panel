import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { ApiCrudService } from 'src/service/crud.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'vex-payment-terminal',
  templateUrl: './payment-terminal.component.html',
  styleUrls: ['./payment-terminal.component.scss']
})
export class PaymentTerminalComponent implements OnInit {
  paymentForm: FormGroup;
  loading = false;
  paymentLink: string | null = null;
  qrCodeUrl: SafeUrl | null = null;

  constructor(
    private fb: FormBuilder,
    private crudService: ApiCrudService,
    private snackBar: MatSnackBar,
    private translateService: TranslateService,
    private sanitizer: DomSanitizer
  ) {
    this.paymentForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      description: [''],
      clientEmail: ['', [Validators.email]],
      clientName: ['']
    });
  }

  ngOnInit(): void {
  }

  async generatePaymentLink(): Promise<void> {
    if (this.paymentForm.invalid) {
      this.snackBar.open(
        this.translateService.instant('form_validation_error'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    this.loading = true;
    this.paymentLink = null;
    this.qrCodeUrl = null;

    try {
      const formData = this.paymentForm.value;

      const response: any = await this.crudService.post('/admin/payment-terminal/create', {
        amount: formData.amount,
        description: formData.description || '',
        client_email: formData.clientEmail || '',
        client_name: formData.clientName || ''
      }).toPromise();

      if (response && response.payment_link) {
        this.paymentLink = response.payment_link;

        // Generar QR code
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(this.paymentLink)}`;
        this.qrCodeUrl = this.sanitizer.bypassSecurityTrustUrl(qrUrl);

        this.snackBar.open(
          this.translateService.instant('payment_terminal.link_generated'),
          'OK',
          { duration: 3000 }
        );
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error generating payment link:', error);
      this.snackBar.open(
        this.translateService.instant('payment_terminal.error_generating_link'),
        'OK',
        { duration: 5000 }
      );
    } finally {
      this.loading = false;
    }
  }

  copyToClipboard(): void {
    if (this.paymentLink) {
      navigator.clipboard.writeText(this.paymentLink).then(() => {
        this.snackBar.open(
          this.translateService.instant('payment_terminal.link_copied'),
          'OK',
          { duration: 2000 }
        );
      });
    }
  }

  openPaymentLink(): void {
    if (this.paymentLink) {
      window.open(this.paymentLink, '_blank');
    }
  }

  async openVPOS(): Promise<void> {
    try {
      const response: any = await this.crudService.get('/admin/payment-terminal/vpos-url').toPromise();

      if (response && response.vpos_url) {
        window.open(response.vpos_url, '_blank');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error opening VPOS:', error);
      this.snackBar.open(
        this.translateService.instant('payment_terminal.error_opening_vpos'),
        'OK',
        { duration: 5000 }
      );
    }
  }

  reset(): void {
    this.paymentForm.reset();
    this.paymentLink = null;
    this.qrCodeUrl = null;
  }
}
