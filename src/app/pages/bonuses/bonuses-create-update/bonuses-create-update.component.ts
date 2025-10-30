import { Component, OnInit, Inject } from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { fadeInUp400ms } from 'src/@vex/animations/fade-in-up.animation';
import { stagger20ms } from 'src/@vex/animations/stagger.animation';
import { Observable, map, of, startWith } from 'rxjs';
import { ApiCrudService } from 'src/service/crud.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'vex-bonuses-create-update',
  templateUrl: './bonuses-create-update.component.html',
  styleUrls: ['./bonuses-create-update.component.scss'],
  animations: [fadeInUp400ms, stagger20ms]
})
export class BonusesCreateUpdateComponent implements OnInit {

  mode: 'create' | 'update' = 'create';
  defaults: any = {
    code: null,
    name: null,
    description: null,
    quantity: null,
    remaining_balance: null,
    payed: false,
    is_gift: false,
    client_id: null,
    buyer_name: null,
    buyer_email: null,
    buyer_phone: null,
    recipient_name: null,
    recipient_email: null,
    recipient_phone: null,
    school_id: null,
    course_type_id: null,
    expires_at: null,
    max_uses: null,
    uses_count: 0,
    is_transferable: false,
    transferred_to_client_id: null,
    transferred_at: null,
    notes: null,
    created_by: null,
  };
  logs: any = [];
  user: any;

  loading: boolean = true;
  loadingCourseTypes: boolean = false;
  form: UntypedFormGroup;
  clientsForm = new FormControl<any>('');
  filteredOptions: Observable<any[]>;
  isGenericVoucher: boolean = false;

  clients = [];
  courseTypes = [
    { id: 1, name: 'Collective' },
    { id: 2, name: 'Private' }
  ];
  id: any = null;
  voucherSummary: any = null;
  transferredToClient: any = null;

  // Gift voucher templates
  giftTemplates = [
    {
      id: 'birthday',
      name: 'Cumpleaños',
      icon: 'cake',
      message: '¡Feliz cumpleaños! Disfruta de tus clases.',
      defaultName: 'Bono Regalo Cumpleaños'
    },
    {
      id: 'anniversary',
      name: 'Aniversario',
      icon: 'favorite',
      message: 'Feliz aniversario. Gracias por confiar en nosotros durante todo este tiempo.',
      defaultName: 'Bono Aniversario'
    },
    {
      id: 'welcome',
      name: 'Bienvenida',
      icon: 'waving_hand',
      message: 'Bienvenido a nuestra escuela. Esperamos que disfrutes de tus clases.',
      defaultName: 'Bono Bienvenida'
    },
    {
      id: 'custom',
      name: 'Personalizado',
      icon: 'edit',
      message: '',
      defaultName: 'Bono Regalo'
    }
  ];
  selectedTemplate: string = 'custom';
  maxNotesLength: number = 250;

  constructor(
    private fb: UntypedFormBuilder,
    private crudService: ApiCrudService,
    private translateService: TranslateService,
    private snackbar: MatSnackBar,
    public dialogRef: MatDialogRef<BonusesCreateUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));

    // Set mode and id from dialog data
    this.mode = data?.mode || 'create';
    this.id = data?.id || null;

    this.form = this.fb.group({
      code:[null],
      name:[null],
      description:[null],
      quantity:[null, Validators.required],
      remaining_balance:[null],
      payed:[false, Validators.required],
      is_gift:[false, Validators.required],
      buyer_name:[null],
      buyer_email:[null, Validators.email],
      buyer_phone:[null],
      recipient_name:[null],
      recipient_email:[null, Validators.email],
      recipient_phone:[null],
      course_type_id:[null],
      expires_at:[null],
      max_uses:[null],
      is_transferable:[false],
      notes:[null]
    });
  }

  ngOnInit() {
    if (this.mode === 'update' && this.id) {
      this.getVoucher();
    } else {
      this.loading = false;
    }

    this.getClients();
  }

  onGenericVoucherChange() {
    if (this.isGenericVoucher) {
      this.defaults.client_id = null;
      this.clientsForm.setValue('');
    }
  }

  selectTemplate(templateId: string) {
    this.selectedTemplate = templateId;
    const template = this.giftTemplates.find(t => t.id === templateId);

    if (template && this.mode === 'create') {
      this.form.patchValue({
        name: template.defaultName,
        notes: template.message
      });
    }
  }

  get notesLength(): number {
    return this.form.get('notes')?.value?.length || 0;
  }

  save() {
    if (this.mode === 'create') {
      this.create();
    } else if (this.mode === 'update') {
      this.update();
    }
  }

  create() {
    // Get selected client from form control
    const selectedClient = this.clientsForm.value;

    // Validate required fields
    if (!this.isGenericVoucher && !selectedClient) {
      this.snackbar.open(this.translateService.instant('Please select a client or create as generic voucher'), 'OK', {duration: 3000});
      return;
    }

    const formValue = this.form.value;
    const buyerName = formValue.buyer_name ? formValue.buyer_name.trim() : null;
    const buyerEmail = formValue.buyer_email ? formValue.buyer_email.trim() : null;
    const buyerPhone = formValue.buyer_phone ? formValue.buyer_phone.trim() : null;
    const recipientName = formValue.recipient_name ? formValue.recipient_name.trim() : null;
    const recipientEmail = formValue.recipient_email ? formValue.recipient_email.trim() : null;
    const recipientPhone = formValue.recipient_phone ? formValue.recipient_phone.trim() : null;

    if (this.isGenericVoucher && (!buyerName || !buyerEmail)) {
      this.snackbar.open(this.translateService.instant('bonus.error_buyer_required'), 'OK', { duration: 3000 });
      return;
    }

    if (formValue.is_gift && (!recipientName || !recipientEmail)) {
      this.snackbar.open(this.translateService.instant('bonus.error_recipient_required'), 'OK', { duration: 3000 });
      return;
    }

    const data: any = {
      code: formValue.code === null ? "BOU-"+this.generateRandomNumber() : formValue.code,
      name: formValue.name,
      description: formValue.description,
      quantity: formValue.quantity,
      remaining_balance: formValue.quantity,
      payed: formValue.payed,
      is_gift: formValue.is_gift,
      client_id: this.isGenericVoucher ? null : selectedClient?.id,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      recipient_phone: recipientPhone,
      school_id: this.user.schools[0].id,
      course_type_id: formValue.course_type_id,
      expires_at: formValue.expires_at,
      max_uses: formValue.max_uses,
      is_transferable: formValue.is_transferable,
      notes: formValue.notes,
      created_by: this.user.id
    };

    this.crudService.create('/vouchers', data)
      .subscribe({
        next: (res) => {
          this.snackbar.open(this.translateService.instant('snackbar.bonus.create'), 'OK', {duration: 3000});
          this.dialogRef.close(res);
        },
        error: (error) => {
          console.error('Error creating voucher:', error);
          this.snackbar.open(this.translateService.instant('Error creating voucher'), 'OK', {duration: 3000});
        }
      })
  }

  update() {
    const formValue = this.form.value;
    const selectedClient = this.clientsForm.value;
    const buyerName = formValue.buyer_name ? formValue.buyer_name.trim() : null;
    const buyerEmail = formValue.buyer_email ? formValue.buyer_email.trim() : null;
    const buyerPhone = formValue.buyer_phone ? formValue.buyer_phone.trim() : null;
    const recipientName = formValue.recipient_name ? formValue.recipient_name.trim() : null;
    const recipientEmail = formValue.recipient_email ? formValue.recipient_email.trim() : null;
    const recipientPhone = formValue.recipient_phone ? formValue.recipient_phone.trim() : null;

    const hasAssignedClient = !!(selectedClient?.id || this.defaults.client_id?.id);

    if (!hasAssignedClient && (!buyerName || !buyerEmail)) {
      this.snackbar.open(this.translateService.instant('bonus.error_buyer_required'), 'OK', { duration: 3000 });
      return;
    }

    if (formValue.is_gift && (!recipientName || !recipientEmail)) {
      this.snackbar.open(this.translateService.instant('bonus.error_recipient_required'), 'OK', { duration: 3000 });
      return;
    }

    const data: any = {
      code: formValue.code,
      name: formValue.name,
      description: formValue.description,
      quantity: formValue.quantity,
      remaining_balance: formValue.remaining_balance,
      payed: formValue.payed,
      is_gift: formValue.is_gift,
      client_id: selectedClient?.id || this.defaults.client_id?.id || null,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      recipient_phone: recipientPhone,
      school_id: this.user.schools[0].id,
      course_type_id: formValue.course_type_id,
      expires_at: formValue.expires_at,
      max_uses: formValue.max_uses,
      is_transferable: formValue.is_transferable,
      notes: formValue.notes
    };

    this.crudService.update('/vouchers', data, this.id)
      .subscribe({
        next: (res) => {
          this.snackbar.open(this.translateService.instant('snackbar.bonus.update'), 'OK', {duration: 3000});
          this.dialogRef.close(res);
        },
        error: (error) => {
          console.error('Error updating voucher:', error);
          this.snackbar.open(this.translateService.instant('Error updating voucher'), 'OK', {duration: 3000});
        }
      })
  }

  generateRandomCode() {
    const code = "BOU-"+this.generateRandomNumber();
    this.form.patchValue({ code: code });
  }

  private _filter(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.clients.filter(client => (client.first_name.toLowerCase().includes(filterValue) || client.last_name.toLowerCase().includes(filterValue)));
  }

  displayFn(client: any): string {
    return client && client?.first_name && client?.last_name ? client?.first_name + ' ' + client?.last_name : client?.first_name;
  }

  getClients() {
    this.crudService.list('/clients', 1, 10000, 'desc', 'id', '&school_id='+this.user.schools[0].id)
      .subscribe((data: any) => {
        this.clients = data.data;
        this.filteredOptions = this.clientsForm.valueChanges.pipe(
          startWith(''),
          map((value: any) => typeof value === 'string' ? value : value?.name),
          map(full_name => full_name ? this._filter(full_name) : this.clients.slice(0, 50))
        );

        if (this.mode === 'update') {
          const client = this.clients.find((c) => this.defaults.client_id === c.id);
          this.defaults.client_id = client;
          this.isGenericVoucher = !client;
          if (client) {
            this.clientsForm.setValue(client);
          }
        }
        this.loading = false;
      })
  }

  getVoucher() {
    this.crudService.get('/vouchers/'+this.id)
      .subscribe((data: any) => {
        this.defaults = data.data;

        // Populate form with loaded data
        this.form.patchValue({
          code: this.defaults.code,
          name: this.defaults.name,
          description: this.defaults.description,
          quantity: this.defaults.quantity,
          remaining_balance: this.defaults.remaining_balance,
          payed: this.defaults.payed,
          is_gift: this.defaults.is_gift,
          buyer_name: this.defaults.buyer_name,
          buyer_email: this.defaults.buyer_email,
          buyer_phone: this.defaults.buyer_phone,
          recipient_name: this.defaults.recipient_name,
          recipient_email: this.defaults.recipient_email,
          recipient_phone: this.defaults.recipient_phone,
          course_type_id: this.defaults.course_type_id,
          expires_at: this.defaults.expires_at,
          max_uses: this.defaults.max_uses,
          is_transferable: this.defaults.is_transferable,
          notes: this.defaults.notes
        });

        // Get voucher summary for additional info
        this.getVoucherSummary();

        // Get transferred client if applicable
        if (this.defaults.transferred_to_client_id) {
          this.getTransferredClient();
        }

        this.getVoucherLogs();
      })
  }

  getVoucherSummary() {
    this.crudService.get('/vouchers/'+this.id+'/summary')
      .subscribe({
        next: (data: any) => {
          this.voucherSummary = data.data;
        },
        error: (error) => {
          console.error('Error fetching voucher summary:', error);
        }
      });
  }

  getTransferredClient() {
    this.crudService.get('/clients/'+this.defaults.transferred_to_client_id)
      .subscribe({
        next: (data: any) => {
          this.transferredToClient = data.data;
        },
        error: (error) => {
          console.error('Error fetching transferred client:', error);
        }
      });
  }

  getVoucherLogs() {
    this.crudService.list('/vouchers-logs', 1, 10000, 'desc', 'id', '&voucher_id='+this.id)
    .subscribe((vl) => {
        this.logs = vl.data;
        this.loading = false;
      }
    )
  }

  generateRandomNumber() {
    const min = 10000000;
    const max = 99999999;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  get isExpired(): boolean {
    if (!this.defaults.expires_at) return false;
    return new Date(this.defaults.expires_at) < new Date();
  }

  get canBeTransferred(): boolean {
    return this.defaults.is_transferable && !this.defaults.transferred_at && this.defaults.remaining_balance > 0;
  }

  get usagePercentage(): number {
    if (!this.defaults.max_uses) return 0;
    return (this.defaults.uses_count / this.defaults.max_uses) * 100;
  }

  close() {
    this.dialogRef.close();
  }
}
