import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AmbientBackgroundComponent } from '../../../shared/ambient-background/ambient-background.component';
import { AuthService } from '../../../core/services/auth.service';
import { ChatApiService } from '../../../core/services/chat-api.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SignalrService } from '../../../core/services/signalr.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmbientBackgroundComponent],
  templateUrl: './auth-callback.component.html',
  styleUrl: './auth-callback.component.scss',
})
export class AuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly crypto = inject(CryptoService);
  private readonly api = inject(ChatApiService);
  private readonly signalr = inject(SignalrService);
  private readonly notifications = inject(NotificationService);

  readonly status = signal('Decrypting credentials...');
  readonly failed = signal(false);

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const error = params.get('error');
    const token = params.get('token');

    if (error || !token) {
      this.fail(error ?? 'No token received');
      return;
    }

    const user = this.auth.handleCallback(token);
    if (!user) {
      this.fail('Malformed token');
      return;
    }

    try {
      this.status.set('Generating device keys...');
      const publicJwk = await this.crypto.initializeKeys(user.id);

      this.status.set('Registering public key...');
      await firstValueFrom(
        this.api.registerDeviceKey(this.crypto.getDeviceId(), JSON.stringify(publicJwk)),
      );

      this.status.set('Opening secure channel...');
      await this.signalr.startConnection();

      void this.notifications.requestPermission();

      await this.router.navigate(['/channels']);
    } catch {
      this.fail('Key exchange failed');
    }
  }

  retry(): void {
    void this.router.navigate(['/login']);
  }

  private fail(reason: string): void {
    this.status.set(`ACCESS DENIED — ${reason}`);
    this.failed.set(true);
  }
}
