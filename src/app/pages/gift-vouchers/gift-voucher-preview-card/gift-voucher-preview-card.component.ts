import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'vex-gift-voucher-preview-card',
  templateUrl: './gift-voucher-preview-card.component.html',
  styleUrls: ['./gift-voucher-preview-card.component.scss']
})
export class GiftVoucherPreviewCardComponent implements OnInit {

  @Input() amount: number = 0;
  @Input() senderName: string = '';
  @Input() recipientName: string = '';
  @Input() personalMessage: string = '';
  @Input() template: string = 'classic';
  @Input() backgroundColor: string = '#F5F5DC';
  @Input() textColor: string = '#2C3E50';
  @Input() showBorder: boolean = true;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  constructor() { }

  ngOnInit(): void {
  }

  get cardClasses(): string {
    const sizeClasses = {
      small: 'p-4',
      medium: 'p-6',
      large: 'p-8'
    };
    return sizeClasses[this.size];
  }

  get iconSize(): string {
    const sizes = {
      small: 'text-4xl',
      medium: 'text-6xl',
      large: 'text-8xl'
    };
    return sizes[this.size];
  }

  get amountSize(): string {
    const sizes = {
      small: 'text-2xl',
      medium: 'text-4xl',
      large: 'text-5xl'
    };
    return sizes[this.size];
  }
}
