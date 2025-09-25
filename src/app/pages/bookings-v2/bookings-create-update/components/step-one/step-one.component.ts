import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Observable, of } from "rxjs";
import { debounceTime, distinctUntilChanged, finalize, map, shareReplay, startWith, switchMap, tap } from 'rxjs/operators';
import { ApiCrudService } from "src/service/crud.service";
import { ApiResponse } from "src/app/interface/api-response";
import { MatDialog } from '@angular/material/dialog';
import { UtilsService } from '../../../../../../service/utils.service';
import { ClientCreateUpdateModalComponent } from "src/app/pages/clients/client-create-update-modal/client-create-update-modal.component";

@Component({
  selector: "booking-step-one",
  templateUrl: "./step-one.component.html",
  styleUrls: ["./step-one.component.scss"],
})
export class StepOneComponent implements OnInit {
  @Input() initialData: any;
  @Input() allLevels: any;
  @Input() lockClient: boolean = false;
  @Output() stepCompleted = new EventEmitter<FormGroup>();

  stepOneForm: FormGroup;
  user: any;
  filteredOptions: Observable<any[]>;
  selectedClient: any;
  mainClient: any;
  expandClients: any[];
  userAvatar = "../../../../assets/img/avatar.png";

  private readonly searchDebounceMs = 250;
  private searchCache = new Map<string, any[]>();
  private inFlightRequests = new Map<string, Observable<any[]>>();

  constructor(private fb: FormBuilder, private crudService: ApiCrudService, protected utilsService: UtilsService,
    private dialog: MatDialog) { }

  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem("boukiiUser"));
    this.selectedClient = this.initialData?.client;
    this.mainClient = this.initialData?.mainClient;
    this.getClients().subscribe({
      next: (response) => {
        const expanded = this.getExpandClients(response.data);
        this.expandClients = expanded;
        this.searchCache.set('', expanded);
      }
    });
    this.stepOneForm = this.fb.group({
      client: [this.selectedClient || "", Validators.required],
      mainClient: [this.mainClient, Validators.required],
    });
    this.filteredOptions = this.stepOneForm.get('client')!.valueChanges.pipe(
      startWith(''),
      map((value: unknown) => this.normalizeSearchTerm(value)),
      debounceTime(this.searchDebounceMs),
      distinctUntilChanged(),
      switchMap((term) => this.lookupClients(term)),
      tap((options) => (this.expandClients = options))
    );
  }

  setClient(ev: any) {
    if (this.lockClient) {
      // Cliente bloqueado: ignorar cambios
      this.completeStep();
      return;
    }
    this.selectedClient = ev;
    this.stepOneForm.patchValue({
      client: ev,
      mainClient: this.selectedClient.main_client || this.selectedClient,
    });
    this.completeStep();
  }

  addClient() {
    const dialogRef = this.dialog.open(ClientCreateUpdateModalComponent, {
      width: '1000px',
      height: 'max-content',
      panelClass: 'full-screen-dialog',
      data: { id: this.user.schools[0].id }
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      if (data) {
        this.getClients().subscribe({
          next: (response) => {
            const expanded = this.getExpandClients(response.data);
            this.expandClients = expanded;
            this.searchCache.set('', expanded);
            const createdId = data?.data?.data?.id;
            if (createdId) {
              const newClient = expanded.find((c) => c.id === createdId);
              if (newClient) {
                this.setClient(newClient);
              }
            }
          }
        });
      }
    })
  }

  displayFn(client: any): string {
    return client && client?.first_name && client?.last_name
      ? client?.first_name + " " + client?.last_name
      : client?.first_name;
  }

  isFormValid() {
    return (
      this.stepOneForm.valid &&
      this.selectedClient === this.stepOneForm.get("client").value
    );
  }

  getClients(): Observable<ApiResponse> {
    return this.crudService.list(
      "/admin/clients/mains",
      1,
      50,
      "desc",
      "id",
      "&school_id=" + this.user.schools[0].id + "&active=1"
    );
  }

  completeStep() {
    if (this.isFormValid()) {
      this.stepCompleted.emit(this.stepOneForm);
    }
  }

  private getExpandClients(clients: any[]): any[] {
    return clients.reduce((expanded, client) => {
      expanded.push(client);
      if (client.utilizers?.length) {
        const utilizers = client.utilizers.map(utilizer => ({
          ...utilizer,
          main_client: client,
        }));
        expanded.push(...utilizers);
      }
      return expanded;
    }, []);
  }

  private _filter(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.expandClients.filter(
      (client) =>
        client.first_name.toLowerCase().includes(filterValue) ||
        client.last_name.toLowerCase().includes(filterValue)
    );
  }

  private normalizeSearchTerm(raw: unknown): string {
    if (typeof raw === 'string') {
      return raw.trim().toLowerCase();
    }
    if (raw && typeof raw === 'object') {
      const client: any = raw;
      const first = client.first_name ?? '';
      const last = client.last_name ?? '';
      return `${first} ${last}`.trim().toLowerCase();
    }
    return '';
  }

  private lookupClients(term: string): Observable<any[]> {
    const normalized = term.length >= 2 ? term : '';

    const cached = this.searchCache.get(normalized);
    if (cached) {
      return of(cached);
    }

    const existingRequest = this.inFlightRequests.get(normalized);
    if (existingRequest) {
      return existingRequest;
    }

    const request$ = this.fetchClients(normalized).pipe(
      tap((clients) => this.searchCache.set(normalized, clients)),
      finalize(() => this.inFlightRequests.delete(normalized)),
      shareReplay(1)
    );

    this.inFlightRequests.set(normalized, request$);
    return request$;
  }

  private fetchClients(searchTerm: string): Observable<any[]> {
    const encodedSearch = encodeURIComponent(searchTerm);
    const filter = `&school_id=${this.user.schools[0].id}&active=1${searchTerm ? `&search=${encodedSearch}` : ''}`;

    return this.crudService
      .list('/admin/clients/mains', 1, 50, 'desc', 'id', filter)
      .pipe(map((response: ApiResponse) => this.getExpandClients(response.data)));
  }
}
