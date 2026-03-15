import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface RentalsQrPreviewDialogData {
  title: string;
  subtitle: string;
  codeValue: string;
  sku?: string;
  barcode?: string;
  fileName: string;
  dataUrl: string;
}

@Component({
  selector: 'vex-rentals-qr-preview-dialog',
  templateUrl: './rentals-qr-preview-dialog.component.html',
  styleUrls: ['./rentals-qr-preview-dialog.component.scss']
})
export class RentalsQrPreviewDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<RentalsQrPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: RentalsQrPreviewDialogData
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  download(): void {
    const link = document.createElement('a');
    link.href = this.data.dataUrl;
    link.download = this.data.fileName;
    link.click();
  }

  print(): void {
    const popup = window.open('', '_blank', 'width=760,height=760');
    if (!popup) {
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>${this.escapeHtml(this.data.title)}</title>
          <style>
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              display: grid;
              place-items: center;
              min-height: 100vh;
              color: #0f172a;
            }
            .sheet {
              text-align: center;
              padding: 24px;
            }
            img {
              width: 320px;
              height: 320px;
              object-fit: contain;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 22px;
            }
            p {
              margin: 4px 0;
              font-size: 14px;
            }
            .code {
              margin-top: 12px;
              font-family: "Courier New", monospace;
              font-size: 16px;
              letter-spacing: 0.08em;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <h1>${this.escapeHtml(this.data.title)}</h1>
            <p>${this.escapeHtml(this.data.subtitle || '')}</p>
            <img src="${this.data.dataUrl}" alt="QR preview" />
            <p class="code">${this.escapeHtml(this.data.codeValue)}</p>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
