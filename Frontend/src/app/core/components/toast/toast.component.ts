// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Frontend\src\app\core\components\toast\toast.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ToastService, ToastMessage } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  animations: [
    trigger('toastAnimation', [
      state('void', style({ transform: 'translateY(100%)', opacity: 0 })),
      state('*', style({ transform: 'translateY(0)', opacity: 1 })),
      transition('void => *', animate('300ms ease-out')),
      transition('* => void', animate('300ms ease-in'))
    ])
  ]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private subscription!: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.subscription = this.toastService.toastState.subscribe(
      (toast: ToastMessage) => {
        this.showToast(toast);
      }
    );
  }

  showToast(toast: ToastMessage) {
    this.toasts.push(toast);
    if (toast.duration) {
      setTimeout(() => this.removeToast(toast), toast.duration);
    }
  }

  removeToast(toast: ToastMessage) {
    this.toasts = this.toasts.filter(t => t !== toast);
  }

  getToastClass(toast: ToastMessage): string {
    return `toast toast-${toast.type}`;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}