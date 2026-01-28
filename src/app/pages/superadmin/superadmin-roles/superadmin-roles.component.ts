import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SuperadminService } from 'src/app/services/superadmin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-superadmin-roles',
  templateUrl: './superadmin-roles.component.html',
  styleUrls: ['./superadmin-roles.component.scss']
})
export class SuperadminRolesComponent implements OnInit {
  roles: any[] = [];
  loading = false;
  displayedColumns = ['name', 'permissions'];
  form = this.fb.group({
    name: ['', Validators.required],
    permissions: ['']
  });

  constructor(
    private superadmin: SuperadminService,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.fetchRoles();
  }

  fetchRoles(): void {
    this.loading = true;
    this.superadmin.listRoles().subscribe({
      next: ({ data }) => {
        this.roles = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getPermissionNames(role: any): string {
    if (!role.permissions || !role.permissions.length) {
      return '—';
    }
    return role.permissions.map((p: any) => p.name).join(', ');
  }

  submitRole(): void {
    if (this.form.invalid) {
      return;
    }

    const permissions = (this.form.value.permissions || '')
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    this.superadmin.createRole({ name: this.form.value.name, permissions })
      .subscribe({
        next: () => {
          this.snack.open('Role created', 'OK', { duration: 2000 });
          this.form.reset();
          this.fetchRoles();
        }
      });
  }
}
