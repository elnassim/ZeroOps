import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<ToastMessage>();
  toastState = this.toastSubject.asObservable();
  private toastIdCounter = 0;

  constructor() { }

  show(message: string, type: ToastMessage['type'], duration: number = 5000) {
    this.toastIdCounter++;
    this.toastSubject.next({ id: this.toastIdCounter, message, type, duration });
  }

  showSuccess(message: string, duration: number = 3000) {
    this.show(message, 'success', duration);
  }

  showError(message: string, duration: number = 7000) {
    this.show(message, 'error', duration);
  }

  showInfo(message: string, duration: number = 4000) {
    this.show(message, 'info', duration);
  }

  showWarning(message: string, duration: number = 5000) {
    this.show(message, 'warning', duration);
  }

  removeToast(id: number) {
    // This part would be implemented in a component that displays toasts,
    // allowing it to signal back to remove a specific toast.
    // For simplicity, this service only emits. A more complex system
    // might manage the active toasts list here.
  }
}