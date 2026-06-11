import { Injectable } from '@angular/core';

/** Browser/PWA notifications + haptic helpers. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private get supported(): boolean {
    return typeof Notification !== 'undefined';
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.supported) {
      return 'denied';
    }
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Notification.permission;
    }
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  notifyNewMessage(senderLogin: string, conversationId: number): void {
    this.show('⚡ INCOMING TRANSMISSION', {
      body: `@${senderLogin} sent an encrypted message.`,
      tag: `conv-${conversationId}-new`,
    });
    this.vibrate([40, 30, 40]);
  }

  notifyYourTurn(conversationId: number): void {
    this.show('▷ YOUR TURN', {
      body: 'The channel awaits your transmission.',
      tag: `conv-${conversationId}-turn`,
    });
    this.vibrate(60);
  }

  vibrate(pattern: number | number[]): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  private show(title: string, options: NotificationOptions): void {
    if (!this.supported || Notification.permission !== 'granted') {
      return;
    }
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      // Avoid noisy notifications while the app is focused.
      return;
    }
    try {
      new Notification(title, { icon: 'icons/icon-192x192.png', badge: 'icons/icon-96x96.png', ...options });
    } catch {
      /* notifications best-effort */
    }
  }
}
