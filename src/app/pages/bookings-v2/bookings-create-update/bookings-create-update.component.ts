import {ChangeDetectorRef, Component, Inject, Optional, OnInit, OnDestroy} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {BookingDialogComponent} from './components/booking-dialog/booking-dialog.component';
import {ClientParticipantConflictDialogComponent} from './components/client-participant-conflict-dialog/client-participant-conflict-dialog.component';
import {FormBuilder, FormGroup} from '@angular/forms';
import {BookingService} from '../../../../service/bookings.service';
import {ApiCrudService} from '../../../../service/crud.service';
import {Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import moment from 'moment';
import { SchoolService } from 'src/service/school.service';
import { BookingPersistenceService } from 'src/app/services/booking-persistence.service';
import { Subscription } from 'rxjs';
import { PAYMENT_METHODS, PaymentMethodId } from '../../../shared/payment-methods';

@Component({
  selector: "bookings-create-update-v2",
  templateUrl: "./bookings-create-update.component.html",
  styleUrls: ["./bookings-create-update.component.scss"],
})
export class BookingsCreateUpdateV2Component implements OnInit, OnDestroy {
  currentStep = 0;
  currentBookingData = {};
  mainClient: any;
  utilizers: any;
  sport: any;
  sportLevel: any;
  forceStep!: any;
  forms: FormGroup[];
  dates: any;
  allLevels: any;
  normalizedDates: any[];
  course!: any;
  monitors!: any;
  clientObs!: any;
  schoolObs!: any;
  total!: any;
  subtotal!: any;
  extraPrice!: any;
  deleteModal: boolean = false
  deleteIndex: number = 1
  endModal: boolean = false
  isDetail = false;
  selectedIndexForm = null;
  selectedForm: FormGroup;
  payModal: boolean = false;
  paymentMethod: number = 1; // Valor por defecto (directo)
  step: number = 1;  // Paso inicial
  selectedPaymentOptionId: PaymentMethodId | null = null;
  selectedPaymentOptionLabel: string = '';
  isPaid = false;
  isConfirmingPayment = false;
  paymentOptions: Array<{ id: PaymentMethodId; label: string }> = [];
  readonly paymentMethods = PAYMENT_METHODS;

  // MEJORA CRÃTICA: Propiedades para persistencia de estado
  private autoSaveInterval: any;
  private syncSubscription: Subscription = new Subscription();
  private currentBookingId: string = '';
  hasUnsavedChanges: boolean = false;
  isDraftLoaded: boolean = false;

  private buildDirectPaymentOptions(): Array<{ id: PaymentMethodId; label: string }> {
    const offlineIds: PaymentMethodId[] = [1, 2, 4];
    return this.paymentMethods
      .filter(method => offlineIds.includes(method.id))
      .map(method => ({ id: method.id, label: this.resolvePaymentLabel(method.id) }));
  }

  private resolvePaymentLabel(id: PaymentMethodId | null): string {
    if (id === null || id === undefined) {
      return '';
    }

    if (id === 2) {
      return this.getGatewayLabel();
    }

    if (id === 3) {
      return this.translateService.instant('payment_paylink');
    }

    const method = this.paymentMethods.find(m => m.id === id);
    if (!method) {
      return '';
    }

    return this.translateService.instant(method.i18nKey);
  }

  private getGatewayLabel(): string {
    const provider = (this.schoolService.getPaymentProvider() || '').toLowerCase();
    if (provider === 'payyo') {
      return this.translateService.instant('payment_payyo');
    }

    const providerName = provider ? this.formatProviderName(provider) : 'Boukii Pay';
    return this.translateService.instant('payment_gateway', { provider: providerName });
  }

  private formatProviderName(value: string): string {
    return value
      .split(/[_\s]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private determinePaymentMethodId(): PaymentMethodId {
    if (this.paymentMethod === 1 && this.selectedPaymentOptionId) {
      return this.selectedPaymentOptionId;
    }

    if (this.paymentMethod === 3) {
      return 3;
    }

    if (this.paymentMethod === 4) {
      return 5;
    }

    return this.selectedPaymentOptionId ?? 1;
  }

  constructor(
    public translateService: TranslateService,
    public dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    public bookingService: BookingService,
    private crudService: ApiCrudService,
    private router: Router,
    private snackBar: MatSnackBar,
    private schoolService: SchoolService,
    private persistenceService: BookingPersistenceService,
    @Optional() public dialogRef: MatDialogRef<BookingsCreateUpdateV2Component>,
    @Optional() @Inject(MAT_DIALOG_DATA) public externalData: any
  ) {
    this.normalizedDates = []
    this.forms = []

    this.paymentOptions = this.buildDirectPaymentOptions();
    if (this.paymentOptions.length > 0) {
      this.selectedPaymentOptionId = this.paymentOptions[0].id;
      this.selectedPaymentOptionLabel = this.paymentOptions[0].label;
    }

    // MEJORA CRÃTICA: Inicializar sistema de persistencia
    this.initializePersistence();

    this.getDegrees();
  }

  ngOnInit(): void {
    // MEJORA CRÍTICA: Verificar integridad de datos al iniciar
    const integrity = this.bookingService.validateBookingDataIntegrity();
    if (!integrity.isValid) {
      console.warn('⚠️ Datos problemáticos detectados al inicializar:', integrity.issues);
      // Limpiar datos problemáticos
      this.bookingService.resetBookingData();
    }

    this.loadDraftIfExists();
  }

  ngOnDestroy(): void {
    this.cleanupPersistence();
  }

  /**
   * MEJORA CRÃTICA: Inicializar sistema de persistencia de estado
   */
  private initializePersistence(): void {
    // Generar ID Ãºnico para esta sesiÃ³n de reserva
    this.currentBookingId = this.generateBookingId();

    // Configurar sincronizaciÃ³n entre tabs
    this.syncSubscription.add(
      this.persistenceService.syncUpdate$.subscribe((syncData) => {
        if (syncData && syncData.bookingId === this.currentBookingId) {
          this.handleSyncUpdate(syncData);
        }
      })
    );

    // Configurar autoguardado cada 30 segundos
    this.autoSaveInterval = setInterval(() => {
      if (this.hasUnsavedChanges && this.forms.length > 0) {
        this.saveDraft();
      }
    }, 30000);
  }

  /**
   * MEJORA CRÃTICA: Intentar cargar borrador existente
   */
  private loadDraftIfExists(): void {
    // Si estamos editando una reserva existente, usar ese ID
    if (this.externalData?.booking?.id) {
      this.currentBookingId = `edit_${this.externalData.booking.id}`;
    }

    const draft = this.persistenceService.loadDraft(this.currentBookingId);

    if (draft && this.shouldLoadDraft(draft)) {
      this.showDraftRecoveryDialog(draft);
    }
  }

  /**
   * MEJORA CRÃTICA: Verificar si debe cargar el borrador
   */
  private shouldLoadDraft(draft: any): boolean {
    // No cargar si ya hay datos externos
    if (this.externalData?.booking) return false;

    // No cargar si el borrador es muy antiguo (mÃ¡s de 1 hora)
    const hourAgo = Date.now() - (60 * 60 * 1000);
    if (draft.timestamp < hourAgo) return false;

    return true;
  }

  /**
   * MEJORA CRÃTICA: Mostrar diÃ¡logo de recuperaciÃ³n de borrador
   */
  private showDraftRecoveryDialog(draft: any): void {
    const dialogRef = this.dialog.open(BookingDialogComponent, {
      width: '400px',
      data: {
        title: this.translateService.instant('booking.draft.recover_title'),
        message: this.translateService.instant('booking.draft.recover_message', {
          timestamp: this.formatTimestamp(draft.timestamp)
        }),
        confirmText: this.translateService.instant('booking.draft.recover_confirm'),
        cancelText: this.translateService.instant('booking.draft.recover_cancel'),
        type: 'question'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDraftData(draft);
      } else {
        this.persistenceService.removeDraft(this.currentBookingId);
      }
    });
  }

  /**
   * MEJORA CRÃTICA: Cargar datos del borrador
   */
  private loadDraftData(draft: any): void {
    try {
      // Restaurar formularios
      if (draft.data.forms) {
        this.forms = draft.data.forms.map(formData => {
          const form = this.fb.group({});
          Object.keys(formData).forEach(key => {
            form.addControl(key, this.fb.group(formData[key]));
          });
          return form;
        });
      }

      // Restaurar estado de los pasos
      if (draft.data.currentStep !== undefined) {
        this.currentStep = draft.data.currentStep;
      }

      // Restaurar datos calculados
      this.restoreCalculatedData(draft.data);

      this.isDraftLoaded = true;
      this.hasUnsavedChanges = false;

      this.snackBar.open(
        this.translateService.instant('booking.draft.recover_success'),
        this.translateService.instant('close'),
        {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        }
      );

      console.log('ðŸ“‹ Borrador cargado exitosamente');
    } catch (error) {
      console.error('Error al cargar borrador:', error);
      this.persistenceService.removeDraft(this.currentBookingId);

      this.snackBar.open(
        this.translateService.instant('booking.draft.recover_error'),
        this.translateService.instant('close'),
        {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        }
      );
    }
  }

  /**
   * MEJORA CRÃTICA: Restaurar datos calculados del borrador
   */
  private restoreCalculatedData(data: any): void {
    if (data.mainClient) this.mainClient = data.mainClient;
    if (data.utilizers) this.utilizers = data.utilizers;
    if (data.sport) this.sport = data.sport;
    if (data.sportLevel) this.sportLevel = data.sportLevel;
    if (data.course) this.course = data.course;
    if (data.total) this.total = data.total;
    if (data.subtotal) this.subtotal = data.subtotal;
    if (data.normalizedDates) this.normalizedDates = data.normalizedDates;

    // MEJORA CRÍTICA: Limpiar datos de bookingData que pueden causar bonos automáticos
    const currentBookingData = this.bookingService.getBookingData();
    if (currentBookingData) {
      // Resetear vouchers para evitar aplicación automática desde borradores
      currentBookingData.vouchers = [];
      currentBookingData.price_total = 0;
      currentBookingData.paid_total = 0;
      currentBookingData.paid = false;
      this.bookingService.setBookingData(currentBookingData);
      console.log('🧹 BookingData limpiado al restaurar borrador para evitar bonos automáticos');
    }
  }

  /**
   * MEJORA CRÃTICA: Guardar borrador actual
   */
  private saveDraft(): void {
    if (!this.currentBookingId) return;

    const formData = this.collectFormData();
    const metadata = {
      currentStep: this.currentStep,
      totalForms: this.forms.length,
      mainClientName: this.mainClient?.name || 'Sin definir',
      sport: this.sport?.name || 'Sin definir',
      lastModified: new Date().toISOString()
    };

    this.persistenceService.saveDraft(this.currentBookingId, formData, metadata);
    this.hasUnsavedChanges = false;
  }

  /**
   * MEJORA CRÃTICA: Recopilar datos de formularios para guardado
   */
  private collectFormData(): any {
    return {
      forms: this.forms.map(form => form.value),
      currentStep: this.currentStep,
      mainClient: this.mainClient,
      utilizers: this.utilizers,
      sport: this.sport,
      sportLevel: this.sportLevel,
      course: this.course,
      total: this.total,
      subtotal: this.subtotal,
      normalizedDates: this.normalizedDates,
      clientObs: this.clientObs,
      schoolObs: this.schoolObs
    };
  }

  // MÃ©todos auxiliares

  private generateBookingId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatTimestamp(timestamp: number): string {
    return moment(timestamp).fromNow();
  }

  private handleSyncUpdate(syncData: any): void {
    if (syncData.action === 'draft_saved') {
      console.log('ðŸ“¡ SincronizaciÃ³n detectada desde otra tab');
    }
  }

  private cleanupPersistence(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    this.syncSubscription.unsubscribe();

    // Guardar antes de salir si hay cambios
    if (this.hasUnsavedChanges) {
      this.saveDraft();
    }
  }

  handleFormChange(formData: any, createNew: boolean = false) {
    const {
      step1: { client, mainClient },
      step2: { utilizers },
      step3: { sport, sportLevel },
      step4: { course },
      step5: { course_dates },
      step6: { clientObs, schoolObs },
    } = formData.value;

    // Preserve the original mainClient if it's already set, only update if it's not set yet
    if (!this.mainClient) {
      this.mainClient = mainClient;
    }

    // VALIDACIÃ“N PREVENTIVA: Verificar coherencia cliente-participantes
    if (mainClient && utilizers) {
      const validationResult = this.validateClientParticipantConsistency(mainClient, utilizers);
      if (!validationResult.isValid) {
        // Filtrar utilizers invÃ¡lidos y mostrar advertencia
        this.utilizers = validationResult.filteredUtilizers;
        this.snackBar.open(
          this.translateService.instant('booking.conflict.filtered', {
            count: validationResult.invalidCount
          }),
          this.translateService.instant('close'),
          { duration: 4000 }
        );
      } else {
        this.utilizers = utilizers;
      }
    } else {
      this.utilizers = utilizers;
    }

    this.sport = sport;
    this.sportLevel = sportLevel;
    this.course = course;
    this.dates = course_dates ? this.getSelectedDates(course_dates) : [];
    //this.monitors = MOCK_MONITORS;
    this.clientObs = clientObs;
    this.schoolObs = schoolObs;
    if (this.course && this.dates) {
      this.calculateTotal();
    }

    if (this.course && this.dates && formData.controls.step6.touched) {
      if (this.selectedIndexForm === null) {
        this.forms.push(formData);
      } else {
        this.forms[this.selectedIndexForm] = formData;
      }
      this.normalizeDates(createNew);

      // MEJORA CRÃTICA: Marcar como cambios no guardados para persistencia
      this.hasUnsavedChanges = true;
    }
  }

  editActivity(data: any, index: number) {
    this.isDetail = false;
    this.currentStep = data.step;
    this.selectedIndexForm = index;
    this.selectedForm = this.forms[index];
    const {
      step1: { client, mainClient },
      step2: { utilizers },
      step3: { sport, sportLevel },
      step4: { course },
      step5: { course_dates },
      step6: { clientObs, schoolObs },
    } = this.selectedForm.value;

    // Don't overwrite mainClient when editing activities - preserve the original mainClient
    if (!this.mainClient) {
      this.mainClient = mainClient;
    }
    this.utilizers = utilizers;
    this.sport = sport;
    this.sportLevel = sportLevel;
    this.course = course;
    this.dates = course_dates ? this.getSelectedDates(course_dates) : [];
    //this.monitors = MOCK_MONITORS;
    this.clientObs = clientObs;
    this.schoolObs = schoolObs;
    this.forceStep = data.step;
    this.cdr.detectChanges();
  }

  addNewActivity() {
    this.isDetail = false;
    this.selectedIndexForm = null;
    this.currentStep = 1;
    const step1Controls = this.forms[0].get('step1').value;
    this.selectedForm = this.fb.group({
      step1: this.fb.group(step1Controls),
      step2: this.fb.group({}),
      step3: this.fb.group({}),
      step4: this.fb.group({}),
      step5: this.fb.group({}),
      step6: this.fb.group({})
    });
    this.utilizers = [];
    this.sport = null;
    this.sportLevel = null;
    this.course = null;
    this.dates = [];
    this.clientObs = null;
    this.schoolObs = null;
    this.forceStep = 1;
    this.calculateTotal();
    this.cdr.detectChanges();
  }

  getDegrees() {
    const user = JSON.parse(localStorage.getItem("boukiiUser"));
    const schoolId = user?.schools?.[0]?.id;

    if (!schoolId) return;

    this.crudService.list('/degrees', 1, 10000, 'asc', 'degree_order', `&school_id=${schoolId}&active=1`)
      .subscribe((data) => {
        this.allLevels = data.data;
        this.mainClient = this.externalData?.mainClient || null;
        this.selectedIndexForm = null;

        const step1Controls = { mainClient: this.mainClient };
        const step2Controls = { utilizers: this.externalData?.utilizers || [] };
        const step4Controls = {
          selectedDate: this.externalData?.date || null,
          onlyPrivate: this.externalData?.onlyPrivate || false
        };
        const step5Controls = {
          date: this.externalData?.date || null,
          hour: this.externalData?.hour || null,
          monitorId: this.externalData?.monitorId || null,
          monitor: this.externalData?.monitor || null
        };

        this.selectedForm = this.fb.group({
          step1: this.fb.group(step1Controls),
          step2: this.fb.group(step2Controls),
          step3: this.fb.group({}),
          step4: this.fb.group(step4Controls),
          step5: this.fb.group(step5Controls),
          step6: this.fb.group({})
        });

        // Si hay mainClient, forzamos a step 1, si no, comenzamos desde el principio
        this.forceStep = this.mainClient ? 1 : 0;
        this.currentStep = this.forceStep;

        this.cdr.detectChanges();
      });
  }

  calculateTotal() {
    let total = 0;
    if(!this.course) {
      this.total = null
      this.subtotal = null
      this.extraPrice = null
    } else {
      if (this.course.course_type === 1) {
        total = this.calculateColectivePrice();
      } else if (this.course.course_type === 2) {
        total = this.calculatePrivatePrice();
      }

      // Asegurarse de que el precio base no sea NaN
      if (isNaN(total) || total === undefined || total === null) {
        total = 0;
      }

      // Calcular el total de los extras
      // Calcula el total de los extras
      const extrasTotal = this.dates.reduce((acc, date) => {
        // Para cursos colectivos
        if (this.course.course_type === 1) {
          if (date.extras && date.extras.length) {
            const extrasPrice = date.extras.reduce((extraAcc, extra) => {
              const price = parseFloat(extra.price) || 0; // Convierte el precio del extra a un nÃºmero
              return extraAcc + (price * (extra.quantity || 1)); // Multiplica el precio del extra por la cantidad
            }, 0);
            return acc + extrasPrice;
          }
        }
        // Para cursos privados
        else if (this.course.course_type === 2) {
          // AsegÃºrate de que 'utilizers' estÃ¡ definido en la fecha
          if (date.utilizers && date.utilizers.length) {
            // Sumar el total de extras de cada utilizador
            date.utilizers.forEach(utilizer => {
              if (utilizer.extras && utilizer.extras.length) {
                const extrasPrice = utilizer.extras.reduce((extraAcc, extra) => {
                  const price = parseFloat(extra.price) || 0; // Convierte el precio del extra a un nÃºmero
                  return extraAcc + (price * (extra.quantity || 1)); // Multiplica el precio del extra por la cantidad
                }, 0);
                acc += extrasPrice; // Suma el precio de los extras del utilizador al acumulador
              }
            });
          }
        }
        return acc; // Retorna el acumulador
      }, 0);

      // Asegurarse de que el total de extras sea un nÃºmero vÃ¡lido
      const validExtrasTotal = isNaN(extrasTotal) ? 0 : extrasTotal;

      // Calcular el total final y asegurarse de que no sea NaN
      const totalSinExtras = total;
      total += validExtrasTotal;

      if (isNaN(total)) {
        total = 0;
      }

      // Formatear los resultados
      this.total = `${total.toFixed(2)} ${this.course.currency}`;
      this.subtotal = `${totalSinExtras.toFixed(2)}`;
      this.extraPrice = `${validExtrasTotal.toFixed(2)}`;
    }
  }


  deleteActivity(index: any) {
    this.forms.splice(index, 1);
    this.normalizedDates.splice(index, 1);
    this.selectedIndexForm = null;
    this.deleteModal = false;
    if (this.forms.length == 0) {
      this.currentStep = 0;
      this.isDetail = false;
      this.selectedForm = this.fb.group({
        step1: this.fb.group({}),
        step2: this.fb.group({}),
        step3: this.fb.group({}),
        step4: this.fb.group({}),
        step5: this.fb.group({}),
        step6: this.fb.group({})
      });
      this.forceStep = 0;
      this.cdr.detectChanges();
    }
  }

  private calculatePrivatePrice() {
    let total = 0;

    if (this.course.is_flexible) {
      // Calcula el precio basado en el intervalo y el nÃºmero de utilizadores para cada fecha
      this.dates.forEach((date: any) => {
        const duration = date.duration; // DuraciÃ³n de cada fecha
        const selectedUtilizers = this.utilizers.length; // NÃºmero de utilizadores

        // Encuentra el intervalo de duraciÃ³n que se aplica
        const interval = this.course.price_range.find(range => {
          return range.intervalo === duration; // Comparar con la duraciÃ³n de la fecha
        });

        if (interval) {
          // Intentar acceso con número y string para compatibilidad
          const priceForPax = parseFloat(interval[selectedUtilizers]) || parseFloat(interval[selectedUtilizers.toString()]) || 0;
          total += priceForPax; // Precio por utilizador para cada fecha
        }

        // Suma el precio total de los extras para cada utilizador en esta fecha
       /* date.utilizers.forEach((utilizer: any) => {
          if (utilizer.extras && utilizer.extras.length) {
            const extrasTotal = utilizer.extras.reduce((acc, extra) => {
              const price = parseFloat(extra.price) || 0; // Convierte el precio del extra a un nÃºmero
              return acc + price;
            }, 0);
            total += extrasTotal; // Suma el total de extras por cada utilizador
          }
        });*/

      });
    } else {
      // Si el curso no es flexible
      this.dates.forEach((date: any) => {
        const dateTotal = parseFloat(this.course.price); // Precio por nÃºmero de utilizadores
        total += dateTotal;
        /*date.utilizers.forEach((utilizer: any) => {
          if (utilizer.extras && utilizer.extras.length) {
            const extrasTotal = utilizer.extras.reduce((acc, extra) => {
              const price = parseFloat(extra.price) || 0; // Convierte el precio del extra a un nÃºmero
              return acc + price;
            }, 0);
            total += extrasTotal; // Suma el total de extras por cada utilizador
          }
        });*/
      });
    }

    return total;
  }

  private normalizeDates(createNew: boolean = false) {
    // Limpia el array normalizedDates antes de llenarlo
    this.normalizedDates = this.forms.map(form => {
      const {
        step1: { client, mainClient },
        step2: { utilizers },
        step3: { sport, sportLevel },
        step4: { course },
        step5: { course_dates },
        step6: { clientObs, schoolObs },
      } = form.value;

      const dates = course_dates ? this.getSelectedDates(course_dates) : [];

      // Calcular el total para cada actividad
      const { total, totalSinExtras, extrasTotal } = this.calculateIndividualTotal(course, dates, utilizers);


      return {
        utilizers,
        sport,
        sportLevel,
        course,
        dates,
        clientObs,
        schoolObs,
        total: `${total} ${course.currency}`, // Guardar el total calculado para esta actividad
        totalSinExtras: totalSinExtras, // Guardar el total sin extras
        extrasTotal: extrasTotal // Guardar el total de extras
      };
    });

    if (createNew) {
      this.addNewActivity();
    } else {
      this.isDetail = true;
    }

  }

  private calculateIndividualTotal(course, dates, utilizers) {
    let total = 0;

    // Calcula el precio base dependiendo del tipo de curso
    if (course.course_type === 1) {
      total = this.calculateColectivePriceForDates(course, dates);
    } else if (course.course_type === 2) {
      total = this.calculatePrivatePriceForDates(course, dates, utilizers);
    }

    // Calcula el total de los extras
    const extrasTotal = dates.reduce((acc, date) => {
      // Para cursos colectivos
      if (course.course_type === 1) {
        if (date.extras && date.extras.length) {
          const extrasPrice = date.extras.reduce((extraAcc, extra) => {
            const price = parseFloat(extra.price) || 0; // Convierte el precio del extra a un nÃºmero
            return extraAcc + (price * (extra.quantity || 1)); // Multiplica el precio del extra por la cantidad
          }, 0);
          return acc + extrasPrice;
        }
      }
      // Para cursos privados
      else if (course.course_type === 2) {
        // AsegÃºrate de que 'utilizers' estÃ¡ definido en la fecha
        if (date.utilizers && date.utilizers.length) {
          // Sumar el total de extras de cada utilizador
          date.utilizers.forEach(utilizer => {
            if (utilizer.extras && utilizer.extras.length) {
              const extrasPrice = utilizer.extras.reduce((extraAcc, extra) => {
                const price = parseFloat(extra.price) || 0; // Convierte el precio del extra a un nÃºmero
                return extraAcc + (price * (extra.quantity || 1)); // Multiplica el precio del extra por la cantidad
              }, 0);
              acc += extrasPrice; // Suma el precio de los extras del utilizador al acumulador
            }
          });
        }
      }
      return acc; // Retorna el acumulador
    }, 0);

    // Total sin extras
    const totalSinExtras = total;

    // Suma el total de extras al total general
    total += extrasTotal;

    // Puedes retornar un objeto con ambos totales si lo prefieres
    return {
      total: total.toFixed(2),
      totalSinExtras: totalSinExtras.toFixed(2),
      extrasTotal: extrasTotal.toFixed(2),
      currency: course.currency // Incluye la moneda si es necesario
    };
  }

  private parseFlexibleDiscounts(raw: any): Array<{ threshold: number; value: number; type: number }> {
    if (!raw) {
      return [];
    }

    let parsed = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return [];
      }
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item: any) => {
        const threshold = Number(item?.date ?? item?.count ?? item?.n ?? 0);
        const value = Number(item?.discount ?? item?.percentage ?? item?.percent ?? item?.value ?? 0);
        const type = Number(item?.type ?? 1); // 1 = porcentaje, 2 = cantidad fija
        return { threshold, value, type };
      })
      .filter(item => item.threshold > 0 && !isNaN(item.value) && item.value > 0);
  }

  private applyFlexibleDiscount(baseTotal: number, selectedDatesCount: number, rawDiscounts: any): number {
    const discounts = this.parseFlexibleDiscounts(rawDiscounts);
    if (baseTotal <= 0 || selectedDatesCount <= 0 || discounts.length === 0) {
      return Math.max(0, baseTotal);
    }

    // Encontrar el descuento aplicable con el umbral más alto que cumpla la condición
    const applicable = discounts
      .filter(discount => selectedDatesCount >= discount.threshold)
      .sort((a, b) => b.threshold - a.threshold)[0];

    if (!applicable || applicable.value <= 0) {
      return Math.max(0, baseTotal);
    }

    let discountedTotal = baseTotal;

    if (applicable.type === 1) {
      // Tipo 1: Descuento porcentual
      const boundedPercentage = Math.max(0, Math.min(100, applicable.value));
      discountedTotal = baseTotal * (1 - boundedPercentage / 100);
    } else if (applicable.type === 2) {
      // Tipo 2: Descuento de cantidad fija
      discountedTotal = baseTotal - applicable.value;
    }

    return Math.max(0, discountedTotal);
  }

  private calculateColectivePriceForDates(course, dates): number {
    const price = parseFloat(course?.price ?? '0');
    const basePrice = isNaN(price) ? 0 : price;

    if (!course?.is_flexible) {
      return Math.max(0, basePrice);
    }

    const selectedDates = Array.isArray(dates) ? dates.length : 0;
    const baseTotal = Math.max(0, basePrice * selectedDates);
    return this.applyFlexibleDiscount(baseTotal, selectedDates, course?.discounts);
  }

  private calculatePrivatePriceForDates(course: any, dates: any, utilizers: any) {
    let total = 0;

    if (course.is_flexible) {
      dates.forEach((date: any) => {
        const duration = date.duration;
        const selectedUtilizers = utilizers.length;

        const interval = course.price_range.find(range => {
          return range.intervalo === duration;
        });

        if (interval) {
          // Intentar acceso con número y string para compatibilidad
          const priceForPax = parseFloat(interval[selectedUtilizers]) || parseFloat(interval[selectedUtilizers.toString()]) || 0;
          total += priceForPax;
        }

/*        date.utilizers.forEach(utilizer => {
          if (utilizer.extras && utilizer.extras.length) {
            const extrasTotal = utilizer.extras.reduce((acc, extra) => {
              const price = parseFloat(extra.price) || 0;
              return acc + price;
            }, 0);
            total += extrasTotal;
          }
        });*/
      });
    } else {
      dates.forEach((date: any) => {
        const dateTotal = parseFloat(course.price);
        total += dateTotal;
/*        date.utilizers.forEach(utilizer => {
          if (utilizer.extras && utilizer.extras.length) {
            const extrasTotal = utilizer.extras.reduce((acc, extra) => {
              const price = parseFloat(extra.price) || 0;
              return acc + price;
            }, 0);
            total += extrasTotal;
          }
        });*/
      });
    }

    return total;
  }

  // MÃ©todo para obtener el intervalo de precios basado en la duraciÃ³n
  private getPriceInterval(duration: number) {
    const priceRanges = this.course.price_range;
    return priceRanges.find((interval: any) => {
      const intervalDuration = this.parseDuration(interval.intervalo);
      return duration <= intervalDuration;
    });
  }

  // MÃ©todo para parsear la duraciÃ³n en formato de texto a minutos
  private parseDuration(durationStr: string): number {
    const parts = durationStr.split(' ');
    let totalMinutes = 0;

    parts.forEach(part => {
      if (part.includes('h')) {
        totalMinutes += parseInt(part, 10) * 60;
      } else if (part.includes('m')) {
        totalMinutes += parseInt(part, 10);
      }
    });

    return totalMinutes;
  }

  private calculateColectivePrice(): number {
    const course = this.course;
    if (!course) {
      return 0;
    }

    const price = parseFloat(course?.price ?? '0');
    const basePrice = isNaN(price) ? 0 : price;

    if (!course.is_flexible) {
      return Math.max(0, basePrice);
    }

    const selectedDates = Array.isArray(this.dates) ? this.dates.length : 0;
    const baseTotal = Math.max(0, basePrice * selectedDates);
    return this.applyFlexibleDiscount(baseTotal, selectedDates, course?.discounts);
  }

  // Filtra las fechas seleccionadas y calcula el precio individual para cada fecha
  getSelectedDates(dates: any) {
    const selectedDates = dates.filter((date: any) => date.selected);

    // Calcular precio individual para cada fecha según el tipo de curso
    if (this.course?.course_type === 2 && this.course?.is_flexible && this.utilizers?.length) {
      // PRIVADOS FLEX: Usar price_range según duración y PAX
      selectedDates.forEach((date: any) => {
        const duration = date.duration;
        const selectedUtilizers = this.utilizers.length;

        // Encuentra el intervalo de duración que se aplica
        const interval = this.course.price_range?.find(range => {
          return range.intervalo === duration;
        });

        if (interval) {
          // Intentar acceso con número y string para compatibilidad
          const priceForPax = parseFloat(interval[selectedUtilizers]) || parseFloat(interval[selectedUtilizers.toString()]) || 0;
          date.price = priceForPax.toString();
          date.currency = this.course.currency || 'CHF';
        } else {
          date.price = '0';
          date.currency = this.course.currency || 'CHF';
        }
      });
    } else if (this.course?.course_type === 0 && this.course?.is_flexible) {
      // COLECTIVOS FLEX: Precio base por fecha
      selectedDates.forEach((date: any) => {
        date.price = this.course?.price || '0';
        date.currency = this.course?.currency || 'CHF';
      });
    } else {
      // CURSOS FIJOS (colectivos o privados): Precio base
      selectedDates.forEach((date: any) => {
        date.price = this.course?.price || '0';
        date.currency = this.course?.currency || 'CHF';
      });
    }

    return selectedDates;
  }

  openBookingDialog() {
    this.dialog.open(BookingDialogComponent, {
      width: "400px",
      panelClass: "customBookingDialog",
      position: {
        bottom: "24px",
        right: "24px",
      },
      data: {
        utilizers: this.utilizers,
        sport: this.sport,
        sportLevel: this.sportLevel,
        course: this.course,
        dates: this.dates,
        monitors: this.monitors,
        clientObs: this.clientObs,
        schoolObs: this.schoolObs,
        total: this.total,
        isDetail: this.isDetail,
        mainClient: this.mainClient,
        normalizedDates: this.normalizedDates
      },
    });
  }

  sumActivityTotal(): number {
    console.log('🔍 sumActivityTotal DEBUG - normalizedDates:', this.normalizedDates);

    const total = this.normalizedDates.reduce((acc, item, index) => {
      console.log(`🔍 Processing activity ${index}:`, {
        itemName: item.course?.name,
        originalTotal: item.total,
        totalAfterRegex: item.total.replace(/[^\d.-]/g, ''),
        parsedValue: parseFloat(item.total.replace(/[^\d.-]/g, ''))
      });

      const numericValue = parseFloat(item.total.replace(/[^\d.-]/g, '')); // Eliminar cualquier cosa que no sea un nÃºmero o signo
      return acc + numericValue;
    }, 0);

    console.log('🔍 sumActivityTotal final result:', total);
    return total;
  }

  forceChange(newStep: any) {
    this.forceStep = newStep;
    this.cdr.detectChanges();

  }

  changeStep(newStep: any) {
    this.forceStep = newStep;
    this.cdr.detectChanges();

  }


  onPaymentMethodChange(event: any) {
    const value = event?.value;

    if (value === 1) {
      const defaultOption = this.paymentOptions[0];
      if (defaultOption) {
        this.selectedPaymentOptionId = defaultOption.id;
        this.selectedPaymentOptionLabel = defaultOption.label;
      } else {
        this.selectedPaymentOptionId = null;
        this.selectedPaymentOptionLabel = '';
      }
    } else if (value === 3) {
      this.selectedPaymentOptionId = 3;
      this.selectedPaymentOptionLabel = this.resolvePaymentLabel(3);
    } else if (value === 4) {
      this.selectedPaymentOptionId = 5;
      this.selectedPaymentOptionLabel = this.resolvePaymentLabel(5);
    } else {
      this.selectedPaymentOptionId = null;
      this.selectedPaymentOptionLabel = '';
    }
  }

  onPaymentOptionSelectionChange(methodId: PaymentMethodId): void {
    this.selectedPaymentOptionId = methodId;
    this.selectedPaymentOptionLabel = this.resolvePaymentLabel(methodId);
  }

  goToNextStep() {
    this.step = 2;  // Cambiar al paso 2 de confirmaciÃ³n de pago
  }

  cancelPaymentStep() {
    if(this.step == 1) {
      this.payModal = false;
    }
    this.step = 1;  // Regresar al paso 1
    this.isPaid = false;  // Resetear isPaid
  }

  // MÃ©todo para finalizar la reserva
  finalizeBooking(): void {
    const bookingData = this.bookingService.getBookingData();
    if (!bookingData) {
      return;
    }

    console.log('🔍 finalizeBooking DEBUG - bookingData antes de setCart:', {
      price_total: bookingData.price_total,
      normalizedDates: this.normalizedDates
    });

    bookingData.cart = this.bookingService.setCart(this.normalizedDates, bookingData);

    const paymentMethodId = this.determinePaymentMethodId();
    const label = this.selectedPaymentOptionLabel || this.resolvePaymentLabel(paymentMethodId);

    bookingData.payment_method_id = paymentMethodId;
    bookingData.selectedPaymentOption = label;

    const priceTotalRaw = bookingData.price_total as any;
    const priceTotalNum = typeof priceTotalRaw === 'number' ? priceTotalRaw : parseFloat(priceTotalRaw ?? '0');
    const safePriceTotal = isNaN(priceTotalNum) ? 0 : priceTotalNum;

    const vouchersTotal = this.calculateTotalVoucherPrice();
    const safeVouchersTotal = isNaN(vouchersTotal) ? 0 : vouchersTotal;

    // MEJORA CRÍTICA: Detectar y prevenir reservas con problemas de precios/bonos
    if (safePriceTotal === 0 && safeVouchersTotal > 0) {
      console.error('🚨 PROBLEMA DETECTADO: Reserva con precio 0€ pero bonos aplicados', {
        priceTotal: safePriceTotal,
        vouchersTotal: safeVouchersTotal,
        vouchers: bookingData.vouchers
      });

      this.snackBar.open(
        'Error: Detectado problema con los precios y bonos. Por favor, revisa la reserva antes de confirmar.',
        this.translateService.instant('close'),
        {
          duration: 5000,
          panelClass: ['error-snackbar']
        }
      );

      // Limpiar bonos automáticos problemáticos y detener proceso
      bookingData.vouchers = [];
      this.bookingService.setBookingData(bookingData);
      return;
    }
    const outstanding = Math.max(0, safePriceTotal - safeVouchersTotal);

    bookingData.paid = false;
    bookingData.paid_total = 0;

    if (paymentMethodId === 1 || paymentMethodId === 4) {
      if (this.isPaid || outstanding === 0) {
        bookingData.paid = true;
        bookingData.paid_total = Math.max(0, safePriceTotal - safeVouchersTotal);
      }
    } else if (outstanding === 0) {
      bookingData.paid = true;
      bookingData.paid_total = Math.max(0, safePriceTotal - safeVouchersTotal);
    }

    const user = JSON.parse(localStorage.getItem("boukiiUser"));
    bookingData.user_id = user.id;

    // Enviar la reserva a la API
    this.crudService.post('/admin/bookings', bookingData)
      .subscribe(
        (result: any) => {
          const bookingId = result.data.id;

          // Manejar pagos en lÃ­nea
          if (bookingData.payment_method_id === 2 || bookingData.payment_method_id === 3) {
            this.crudService.post(`/admin/bookings/payments/${bookingId}`, result.data.basket)
              .subscribe(
                (paymentResult: any) => {
                  if (bookingData.payment_method_id === 2) {
                    if (this.dialogRef) {
                      this.dialogRef.close();
                    }
                    window.open(paymentResult.data, "_self");
                  } else {
                    if (this.dialogRef) {
                      this.dialogRef.close();
                    }
                    this.snackBar.open(this.translateService.instant('snackbar.booking_detail.send_mail'),
                      this.translateService.instant('close'),
                      { duration: 1000 });
                    // MEJORA CRÃTICA: Limpiar borrador al completar reserva exitosamente
                    this.persistenceService.removeDraft(this.currentBookingId);
                    this.hasUnsavedChanges = false;

                    this.router.navigate([`/bookings/update/${bookingId}`]);
                  }
                },
                (error) => {
                  if (this.dialogRef) {
                    this.dialogRef.close();
                  }
                  // MEJORA CRÃTICA: Incluso con error de pago, la reserva se creÃ³ exitosamente
                  this.persistenceService.removeDraft(this.currentBookingId);
                  this.hasUnsavedChanges = false;

                  this.showErrorSnackbar(this.translateService.instant('snackbar.booking.payment.error'));
                  this.router.navigate([`/bookings/update/${bookingId}`]);
                }
              );
          } else {
            if (this.dialogRef) {
              this.dialogRef.close();
            }
            // MEJORA CRÃTICA: Limpiar borrador al completar reserva exitosamente
            this.persistenceService.removeDraft(this.currentBookingId);
            this.hasUnsavedChanges = false;

            // Si no es pago online, llevar directamente a la pÃ¡gina de actualizaciÃ³n
            this.router.navigate([`/bookings/update/${bookingId}`]);
          }
        },
        (error) => {
          // Verificar si es un error de coherencia cliente-participantes
          if (error.error?.message && error.error.message.includes('Error de coherencia')) {
            this.handleClientParticipantConsistencyError(error.error.message);
          } else {
            this.showErrorSnackbar(this.translateService.instant('snackbar.error'));
          }
        }
      );
  }

  calculateTotalVoucherPrice(): number {
    const data = this.bookingService.getBookingData();
    if (!data) {
      return 0;
    }

    const vouchers = Array.isArray((data as any).vouchers) ? (data as any).vouchers : [];
    return vouchers.reduce((acc: number, item: any) => {
      const value = item?.bonus?.reducePrice;
      const parsed = typeof value === 'number' ? value : parseFloat(value ?? '0');
      return acc + (isNaN(parsed) ? 0 : parsed);
    }, 0);
  }



  // Manejo elegante de errores de coherencia cliente-participantes
  handleClientParticipantConsistencyError(errorMessage: string): void {
    // Extraer informaciÃ³n del error
    const participantMatch = errorMessage.match(/participante\s+([^)]+)\s+no\s+pertenece\s+al\s+cliente\s+principal\s+([^)]+)/i);

    let dialogMessage = this.translateService.instant('booking.conflict.detected');
    if (participantMatch) {
      const participantName = participantMatch[1];
      const principalName = participantMatch[2];
      dialogMessage = this.translateService.instant('booking.conflict.participant_mismatch', {
        participant: participantName,
        principal: principalName
      });
    }

    // Mostrar dialog elegante con opciones de correcciÃ³n
    const dialog = this.dialog.open(ClientParticipantConflictDialogComponent, {
      width: '600px',
      disableClose: true,
      data: {
        errorMessage: dialogMessage,
        mainClient: this.mainClient,
        utilizers: this.utilizers,
        normalizedDates: this.normalizedDates,
        onResolved: (solution: any) => {
          // Aplicar soluciÃ³n y reintentar
          this.applyConsistencySolution(solution);
        }
      }
    });
  }

  // Aplicar la soluciÃ³n elegida para resolver la inconsistencia
  applyConsistencySolution(solution: any): void {
    const clientLocked = (this.forms && this.forms.length > 0) || (this.normalizedDates && this.normalizedDates.length > 0);
    switch (solution.action) {
      case 'change_main_client':
        // Bloquear cambio si ya hay actividades en la reserva
        if (clientLocked) {
          this.snackBar.open(
            this.translateService.instant('snackbar.error'),
            this.translateService.instant('close'),
            { duration: 4000 }
          );
          break;
        }
        // Cambiar el cliente principal
        this.mainClient = solution.newMainClient;
        this.snackBar.open(
          this.translateService.instant('booking.conflict.main_client_updated'),
          this.translateService.instant('close'),
          { duration: 4000 }
        );
        break;

      case 'remove_participants':
        // Remover participantes problemÃ¡ticos
        this.normalizedDates = this.normalizedDates.map(date => ({
          ...date,
          utilizers: date.utilizers.filter(u => !solution.participantsToRemove.includes(u.id))
        }));
        this.snackBar.open(
          this.translateService.instant('booking.conflict.participants_removed'),
          this.translateService.instant('close'),
          { duration: 4000 }
        );
        break;

      case 'create_relationship':
        // En este caso, simplemente mostrar mensaje ya que la relaciÃ³n debe crearse manualmente
        this.snackBar.open(
          this.translateService.instant('booking.conflict.create_relationship'),
          this.translateService.instant('close'),
          { duration: 2000 }
        );
        // Reintentar la reserva despuÃ©s de un delay
        setTimeout(() => {
          this.finalizeBooking();
        }, 2500);
        break;
    }
  }

  // ValidaciÃ³n preventiva de coherencia cliente-participantes
  validateClientParticipantConsistency(mainClient: any, utilizers: any[]): {
    isValid: boolean,
    filteredUtilizers: any[],
    invalidCount: number
  } {
    if (!mainClient || !utilizers || utilizers.length === 0) {
      return { isValid: true, filteredUtilizers: utilizers || [], invalidCount: 0 };
    }

    // Obtener IDs vÃ¡lidos: cliente principal + sus utilizers
    const validClientIds = [mainClient.id];

    // Agregar utilizers del cliente principal si estÃ¡n disponibles
    if (mainClient.utilizers && Array.isArray(mainClient.utilizers)) {
      mainClient.utilizers.forEach(utilizer => {
        validClientIds.push(utilizer.id);
      });
    }

    // Filtrar solo utilizers vÃ¡lidos
    const filteredUtilizers = utilizers.filter(utilizer =>
      validClientIds.includes(utilizer.id)
    );

    const invalidCount = utilizers.length - filteredUtilizers.length;
    const isValid = invalidCount === 0;

    return {
      isValid,
      filteredUtilizers,
      invalidCount
    };
  }

  // FunciÃ³n para mostrar un Snackbar en caso de error
  showErrorSnackbar(message: string): void {
    this.snackBar.open(message, "Cerrar", {
      duration: 3000,
      panelClass: ['error-snackbar']
    });
  }
}


