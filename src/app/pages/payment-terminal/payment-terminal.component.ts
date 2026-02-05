import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { ApiCrudService } from 'src/service/crud.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'vex-payment-terminal',
  templateUrl: './payment-terminal.component.html',
  styleUrls: ['./payment-terminal.component.scss']
})
export class PaymentTerminalComponent implements OnInit, OnDestroy {
  paymentForm: FormGroup;
  clientSearchControl = new FormControl('');
  clientOptions: any[] = [];
  clientLoading = false;
  selectedClient: any | null = null;
  loading = false;
  paymentLink: string | null = null;
  qrCodeUrl: SafeUrl | null = null;

  private clientSearchSub: Subscription | null = null;

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
    this.clientSearchSub = this.clientSearchControl.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged()
      )
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.loadClients(value);
        }
      });

    this.loadClients();
  }

  ngOnDestroy(): void {
    this.clientSearchSub?.unsubscribe();
  }

  private loadClients(searchTerm: string = ''): void {
    this.clientLoading = true;

    this.crudService.list('/admin/clients/mains', 1, 25, 'desc', 'id', searchTerm || '')
      .subscribe({
        next: (response: any) => {
          this.clientOptions = response.data || [];
          this.clientLoading = false;
        },
        error: (error) => {
          console.error('Error fetching clients:', error);
          this.clientLoading = false;
        }
      });
  }

  onClientSelected(client: any): void {
    if (!client) {
      return;
    }

    this.selectedClient = client;

    this.paymentForm.patchValue({
      clientName: this.getClientFullName(client),
      clientEmail: client.email || ''
    });
  }

  clearSelectedClient(): void {
    this.selectedClient = null;
    this.clientSearchControl.setValue('');
  }

  displayClientName = (client: any): string => {
    return client ? this.getClientLabel(client) : '';
  };

  public getClientLabel(client: any): string {
    const name = this.getClientFullName(client) || client?.email || '';
    return client?.email ? `${name} · ${client.email}` : name;
  }

  private getClientFullName(client: any): string {
    const nameParts = [client?.first_name, client?.last_name].filter(Boolean);
    return nameParts.join(' ');
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

  reset(): void {
    this.paymentForm.reset();
    this.paymentLink = null;
    this.qrCodeUrl = null;
    this.clearSelectedClient();
  }
}
