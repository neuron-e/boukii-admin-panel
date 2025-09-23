import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isError?: boolean;
}

@Component({
  selector: 'vex-confirm-dialog',
  template: `
    <div class="confirm-dialog">
      <h2 mat-dialog-title class="dialog-title" [ngClass]="{'error-title': data.isError}">
        <mat-icon *ngIf="data.isError" class="error-icon">warning</mat-icon>
        {{ data.title }}
      </h2>

      <mat-dialog-content class="dialog-content">
        <div [innerHTML]="formattedMessage" class="message-content"></div>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions" align="end">
        <button
          *ngIf="data.cancelText"
          mat-button
          [mat-dialog-close]="false"
          class="cancel-button">
          {{ data.cancelText }}
        </button>
        <button
          mat-raised-button
          [color]="data.isError ? 'warn' : 'primary'"
          [mat-dialog-close]="true"
          class="confirm-button">
          {{ data.confirmText || 'Confirmar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      min-width: 400px;
      max-width: 600px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-weight: 600;
    }

    .error-title {
      color: #d32f2f;
    }

    .error-icon {
      color: #ff9800;
      font-size: 24px;
    }

    .dialog-content {
      margin-bottom: 24px;
      min-height: 60px;
    }

    .message-content {
      line-height: 1.5;
      white-space: pre-line;
    }

    .dialog-actions {
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .cancel-button {
      color: #666;
    }

    .confirm-button {
      min-width: 100px;
    }

    /* Estilos para mensajes de advertencia */
    .message-content ::ng-deep strong,
    .message-content ::ng-deep b {
      font-weight: 600;
      color: #d32f2f;
    }
  `]
})
export class ConfirmDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  get formattedMessage(): string {
    return this.data.message.replace(/⚠️/g, '<span style="color: #ff9800; font-size: 1.2em;">⚠️</span>');
  }
}