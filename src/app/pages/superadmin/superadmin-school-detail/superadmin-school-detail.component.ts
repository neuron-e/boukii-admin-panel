import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SuperadminService } from 'src/app/services/superadmin.service';
import { MatDialog } from '@angular/material/dialog';
import { SuperadminAdminCreateComponent } from '../superadmin-admin-create/superadmin-admin-create.component';
import { SuperadminAdminEditComponent } from '../superadmin-admin-edit/superadmin-admin-edit.component';
import { SuperadminAdminPasswordComponent } from '../superadmin-admin-password/superadmin-admin-password.component';

@Component({
  selector: 'app-superadmin-school-detail',
  templateUrl: './superadmin-school-detail.component.html',
  styleUrls: ['./superadmin-school-detail.component.scss']
})
export class SuperadminSchoolDetailComponent implements OnInit {
  loading = false;
  saving = false;
  schoolId: number;
  details: any;
  sports: any[] = [];
  stations: any[] = [];
  settings: any = {};

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    slug: [''],
    contact_email: [''],
    contact_phone: [''],
    contact_telephone: [''],
    contact_address: [''],
    contact_city: [''],
    contact_cp: [''],
    contact_province: [''],
    contact_country: [''],
    fiscal_name: [''],
    fiscal_id: [''],
    fiscal_address: [''],
    fiscal_cp: [''],
    fiscal_city: [''],
    fiscal_province: [''],
    fiscal_country: [''],
    iban: [''],
    active: [true],
    logo: [''],
    payrexx_instance: [''],
    payrexx_key: [''],
    conditions_url: [''],
    payment_link_validity_hours: [''],
    cancellation_insurance_percent: [''],
    taxes_tva: [''],
    taxes_currency: ['CHF'],
    cancellation_with_insurance: [''],
    cancellation_without_insurance: [''],
    bookings_comission_cash: [''],
    bookings_comission_boukii_pay: [''],
    bookings_comission_other: [''],
    school_rate: [''],
    has_ski: [false],
    has_snowboard: [false],
    has_telemark: [false],
    has_rando: [false],
    inscription: [false],
    type: [''],
    sport_ids: [[]],
    station_ids: [[]],
    subscription_plan: [''],
    subscription_status: [''],
    subscription_since: [''],
    subscription_price: [''],
    subscription_currency: ['CHF'],
    subscription_period: ['month'],
    gateway_provider: [''],
    gateway_product_type: [''],
    gateway_webhook_url: [''],
    gateway_webhook_secret: [''],
    booking_private_min_lead_minutes: [''],
    booking_private_overbooking_limit: [''],
    booking_social_facebook: [''],
    booking_social_instagram: [''],
    booking_social_x: [''],
    booking_social_youtube: [''],
    booking_social_tiktok: [''],
    booking_social_linkedin: [''],
    booking_banner_link: [''],
    booking_banner_desktop: [''],
    booking_banner_mobile: [''],
    locations: this.fb.array([])
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private service: SuperadminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.schoolId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    if (!this.schoolId) {
      return;
    }
    this.loading = true;
    this.service.getSchoolDetails(this.schoolId).subscribe({
      next: (res: any) => {
        this.details = res?.data ?? res;
        const school = this.details?.school ?? this.details;
        this.settings = this.normalizeSettings(school?.settings);
        this.sports = this.details?.lookups?.sports ?? [];
        this.stations = this.details?.lookups?.stations ?? [];
        const bookingSocial = this.settings?.booking?.social ?? {};
        const bookingBanner = this.settings?.bookingPage?.banner ?? {};
        const subscription = this.settings?.subscription ?? {};
        const gateway = this.settings?.gateway ?? {};
        const taxes = this.settings?.taxes ?? {};
        const cancellations = this.settings?.cancellations ?? {};
        const locations = Array.isArray(this.settings?.locations) ? this.settings.locations : [];
        this.form.patchValue({
          name: school?.name ?? '',
          description: school?.description ?? '',
          slug: school?.slug ?? '',
          contact_email: school?.contact_email ?? '',
          contact_phone: school?.contact_phone ?? '',
          contact_telephone: school?.contact_telephone ?? '',
          contact_address: school?.contact_address ?? '',
          contact_city: school?.contact_city ?? '',
          contact_cp: school?.contact_cp ?? '',
          contact_province: school?.contact_province ?? '',
          contact_country: school?.contact_country ?? '',
          fiscal_name: school?.fiscal_name ?? '',
          fiscal_id: school?.fiscal_id ?? '',
          fiscal_address: school?.fiscal_address ?? '',
          fiscal_cp: school?.fiscal_cp ?? '',
          fiscal_city: school?.fiscal_city ?? '',
          fiscal_province: school?.fiscal_province ?? '',
          fiscal_country: school?.fiscal_country ?? '',
          iban: school?.iban ?? '',
          active: school?.active ?? true,
          logo: school?.logo ?? '',
          payrexx_instance: school?.payrexx_instance ?? '',
          payrexx_key: school?.payrexx_key ?? '',
          conditions_url: school?.conditions_url ?? '',
          payment_link_validity_hours: school?.payment_link_validity_hours ?? '',
          cancellation_insurance_percent: school?.cancellation_insurance_percent ?? '',
          taxes_tva: taxes?.tva ?? '',
          taxes_currency: taxes?.currency ?? 'CHF',
          cancellation_with_insurance: cancellations?.with_cancellation_insurance ?? '',
          cancellation_without_insurance: cancellations?.without_cancellation_insurance ?? '',
          bookings_comission_cash: school?.bookings_comission_cash ?? '',
          bookings_comission_boukii_pay: school?.bookings_comission_boukii_pay ?? '',
          bookings_comission_other: school?.bookings_comission_other ?? '',
          school_rate: school?.school_rate ?? '',
          has_ski: school?.has_ski ?? false,
          has_snowboard: school?.has_snowboard ?? false,
          has_telemark: school?.has_telemark ?? false,
          has_rando: school?.has_rando ?? false,
          inscription: school?.inscription ?? false,
          type: school?.type ?? '',
          sport_ids: this.details?.school_sport_ids ?? [],
          station_ids: this.details?.school_station_ids ?? [],
          subscription_plan: subscription?.plan ?? '',
          subscription_status: subscription?.status ?? '',
          subscription_since: subscription?.since ?? '',
          subscription_price: subscription?.price ?? '',
          subscription_currency: subscription?.currency ?? 'CHF',
          subscription_period: subscription?.period ?? 'month',
          gateway_provider: gateway?.provider ?? '',
          gateway_product_type: gateway?.product_type ?? '',
          gateway_webhook_url: gateway?.webhook_url ?? '',
          gateway_webhook_secret: gateway?.webhook_secret ?? '',
          booking_private_min_lead_minutes: this.settings?.booking?.private_min_lead_minutes ?? '',
          booking_private_overbooking_limit: this.settings?.booking?.private_overbooking_limit ?? '',
          booking_social_facebook: bookingSocial?.facebook ?? '',
          booking_social_instagram: bookingSocial?.instagram ?? '',
          booking_social_x: bookingSocial?.x ?? '',
          booking_social_youtube: bookingSocial?.youtube ?? '',
          booking_social_tiktok: bookingSocial?.tiktok ?? '',
          booking_social_linkedin: bookingSocial?.linkedin ?? '',
          booking_banner_link: bookingBanner?.link ?? '',
          booking_banner_desktop: bookingBanner?.desktopImg ?? '',
          booking_banner_mobile: bookingBanner?.mobileImg ?? ''
        });
        this.setLocations(locations);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  back(): void {
    this.router.navigate(['/superadmin/schools']);
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      return;
    }
    this.saving = true;
    const payload: any = { ...this.form.getRawValue() };
    const settings = this.mergeSettings(payload);
    payload.settings = settings;
    delete payload.locations;
    delete payload.subscription_plan;
    delete payload.subscription_status;
    delete payload.subscription_since;
    delete payload.subscription_price;
    delete payload.subscription_currency;
    delete payload.subscription_period;
    delete payload.gateway_provider;
    delete payload.gateway_product_type;
    delete payload.gateway_webhook_url;
    delete payload.gateway_webhook_secret;
    delete payload.booking_private_min_lead_minutes;
    delete payload.booking_private_overbooking_limit;
    delete payload.booking_social_facebook;
    delete payload.booking_social_instagram;
    delete payload.booking_social_x;
    delete payload.booking_social_youtube;
    delete payload.booking_social_tiktok;
    delete payload.booking_social_linkedin;
    delete payload.booking_banner_link;
    delete payload.booking_banner_desktop;
    delete payload.booking_banner_mobile;
    delete payload.taxes_tva;
    delete payload.taxes_currency;
    delete payload.cancellation_with_insurance;
    delete payload.cancellation_without_insurance;
    this.service.updateSchool(this.schoolId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.snack.open('School updated', 'OK', { duration: 2500 });
        this.load();
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  openCreateAdmin(): void {
    const ref = this.dialog.open(SuperadminAdminCreateComponent, {
      width: '520px',
      data: { schoolId: this.schoolId }
    });
    ref.afterClosed().subscribe((refresh) => {
      if (refresh) {
        this.load();
      }
    });
  }

  openEditAdmin(admin: any): void {
    const ref = this.dialog.open(SuperadminAdminEditComponent, {
      width: '520px',
      data: { admin }
    });
    ref.afterClosed().subscribe((refresh) => {
      if (refresh) {
        this.load();
      }
    });
  }

  openResetPassword(admin: any): void {
    const ref = this.dialog.open(SuperadminAdminPasswordComponent, {
      width: '420px',
      data: { admin }
    });
    ref.afterClosed().subscribe((refresh) => {
      if (refresh) {
        this.load();
      }
    });
  }

  removeAdmin(admin: any): void {
    if (!confirm('Remove this admin from the school?')) {
      return;
    }
    const adminId = admin?.user?.id ?? admin?.id;
    this.service.deleteAdmin(adminId, { school_id: this.schoolId }).subscribe({
      next: () => {
        this.snack.open('Admin removed', 'OK', { duration: 2500 });
        this.load();
      }
    });
  }

  getAdminRoles(admin: any): string {
    const roles = admin?.user?.roles ?? [];
    if (!Array.isArray(roles) || roles.length === 0) {
      return '-';
    }
    return roles.map((role: any) => role?.name).filter(Boolean).join(', ') || '-';
  }

  private normalizeSettings(settings: any): any {
    if (!settings) {
      return {};
    }
    if (typeof settings === 'string') {
      try {
        return JSON.parse(settings);
      } catch {
        return {};
      }
    }
    return settings;
  }

  private mergeSettings(payload: any): any {
    const current = this.normalizeSettings(this.settings);
    const locations = Array.isArray(payload.locations) ? payload.locations : current?.locations ?? [];
    const subscription = {
      plan: payload.subscription_plan ?? current?.subscription?.plan,
      status: payload.subscription_status ?? current?.subscription?.status,
      since: payload.subscription_since ?? current?.subscription?.since,
      price: payload.subscription_price ?? current?.subscription?.price,
      currency: payload.subscription_currency ?? current?.subscription?.currency,
      period: payload.subscription_period ?? current?.subscription?.period
    };
    const gateway = {
      provider: payload.gateway_provider ?? current?.gateway?.provider,
      product_type: payload.gateway_product_type ?? current?.gateway?.product_type,
      webhook_url: payload.gateway_webhook_url ?? current?.gateway?.webhook_url,
      webhook_secret: payload.gateway_webhook_secret ?? current?.gateway?.webhook_secret
    };
    const bookingSocial = {
      facebook: payload.booking_social_facebook ?? current?.booking?.social?.facebook,
      instagram: payload.booking_social_instagram ?? current?.booking?.social?.instagram,
      x: payload.booking_social_x ?? current?.booking?.social?.x,
      youtube: payload.booking_social_youtube ?? current?.booking?.social?.youtube,
      tiktok: payload.booking_social_tiktok ?? current?.booking?.social?.tiktok,
      linkedin: payload.booking_social_linkedin ?? current?.booking?.social?.linkedin
    };
    const booking = {
      ...(current?.booking ?? {}),
      social: bookingSocial,
      private_min_lead_minutes: payload.booking_private_min_lead_minutes ?? current?.booking?.private_min_lead_minutes,
      private_overbooking_limit: payload.booking_private_overbooking_limit ?? current?.booking?.private_overbooking_limit
    };
    const bookingPage = {
      ...(current?.bookingPage ?? {}),
      banner: {
        link: payload.booking_banner_link ?? current?.bookingPage?.banner?.link,
        desktopImg: payload.booking_banner_desktop ?? current?.bookingPage?.banner?.desktopImg,
        mobileImg: payload.booking_banner_mobile ?? current?.bookingPage?.banner?.mobileImg
      }
    };
    const taxes = {
      ...(current?.taxes ?? {}),
      cancellation_insurance_percent: payload.cancellation_insurance_percent ?? current?.taxes?.cancellation_insurance_percent,
      currency: payload.taxes_currency ?? current?.taxes?.currency,
      tva: payload.taxes_tva ?? current?.taxes?.tva
    };
    const cancellations = {
      ...(current?.cancellations ?? {}),
      with_cancellation_insurance: payload.cancellation_with_insurance ?? current?.cancellations?.with_cancellation_insurance,
      without_cancellation_insurance: payload.cancellation_without_insurance ?? current?.cancellations?.without_cancellation_insurance
    };

    return {
      ...current,
      subscription,
      gateway,
      booking,
      bookingPage,
      taxes,
      cancellations,
      locations
    };
  }

  get locationsArray(): FormArray {
    return this.form.get('locations') as FormArray;
  }

  setLocations(locations: any[]) {
    const array = new FormArray([]);
    locations.forEach((loc) => {
      array.push(this.fb.group({
        name: [loc?.name ?? '', Validators.required],
        address: [loc?.address ?? '']
      }));
    });
    this.form.setControl('locations', array);
  }

  addLocation() {
    this.locationsArray.push(this.fb.group({
      name: ['', Validators.required],
      address: ['']
    }));
  }

  removeLocation(index: number) {
    if (index < 0 || index >= this.locationsArray.length) {
      return;
    }
    this.locationsArray.removeAt(index);
  }
}
