import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AmbientBackgroundComponent } from '../../../shared/ambient-background/ambient-background.component';
import { Conversation } from '../../../core/models/conversation.model';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ChatApiService } from '../../../core/services/chat-api.service';
import { SignalrService } from '../../../core/services/signalr.service';
import { AudioService } from '../../../core/services/audio.service';
import { conversations, currentUser, setConversations, upsertConversation } from '../../../core/state/app.state';

@Component({
  selector: 'app-channel-hub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmbientBackgroundComponent],
  templateUrl: './channel-hub.component.html',
  styleUrl: './channel-hub.component.scss',
})
export class ChannelHubComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ChatApiService);
  private readonly signalr = inject(SignalrService);
  private readonly audio = inject(AudioService);
  private readonly destroyRef = inject(DestroyRef);

  readonly conversations = conversations;
  readonly currentUser = currentUser;
  readonly onlineUserIds = signal<Set<number>>(new Set());

  readonly loading = signal(true);
  readonly dialogOpen = signal(false);
  readonly newChannelLogin = signal('');
  readonly dialogError = signal<string | null>(null);
  readonly submitting = signal(false);

  readonly systemMessages = [
    'SIGNAL STABLE · ENCRYPTION ACTIVE',
    'ZERO-KNOWLEDGE RELAY ONLINE',
    'CIPHER LATTICE NOMINAL',
    'ALL TRANSMISSIONS EPHEMERAL',
  ];
  readonly systemIndex = signal(0);
  readonly systemStatus = computed(() => {
    const count = this.conversations().length;
    return `${this.systemMessages[this.systemIndex()]} · ${count} CHANNEL${count === 1 ? '' : 'S'} OPEN`;
  });

  private statusTimer: ReturnType<typeof setInterval> | null = null;

  async ngOnInit(): Promise<void> {
    await this.signalr.startConnection();

    this.signalr.onConversationUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((c) => upsertConversation(c));

    this.signalr.onUserOnline$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => this.onlineUserIds.update((s) => new Set(s).add(id)));

    this.signalr.onUserOffline$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) =>
        this.onlineUserIds.update((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        }),
      );

    this.signalr.onReceiveMessage$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.audio.playIncoming());

    try {
      const list = await firstValueFrom(this.api.getConversations());
      setConversations(list);
    } finally {
      this.loading.set(false);
    }

    this.statusTimer = setInterval(() => {
      this.systemIndex.update((i) => (i + 1) % this.systemMessages.length);
    }, 4500);
  }

  ngOnDestroy(): void {
    if (this.statusTimer !== null) {
      clearInterval(this.statusTimer);
    }
  }

  contactOf(conv: Conversation): User {
    return conv.initiator.id === this.currentUser()?.id ? conv.responder : conv.initiator;
  }

  isMyTurn(conv: Conversation): boolean {
    return conv.currentTurnUserId === this.currentUser()?.id;
  }

  isOnline(conv: Conversation): boolean {
    return this.onlineUserIds().has(this.contactOf(conv).id);
  }

  openChannel(conv: Conversation): void {
    void this.router.navigate(['/chat', conv.id]);
  }

  openDialog(): void {
    this.dialogError.set(null);
    this.newChannelLogin.set('');
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  logout(): void {
    void this.signalr.stopConnection();
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  async createChannel(): Promise<void> {
    const login = this.newChannelLogin().trim();
    if (!login) {
      return;
    }
    this.submitting.set(true);
    this.dialogError.set(null);
    try {
      const conv = await firstValueFrom(this.api.startConversation(login));
      upsertConversation(conv);
      this.dialogOpen.set(false);
      this.openChannel(conv);
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err && 'error' in err && typeof (err as { error: unknown }).error === 'string'
          ? (err as { error: string }).error
          : `Could not reach @${login}. They may not have an identity yet.`;
      this.dialogError.set(message);
    } finally {
      this.submitting.set(false);
    }
  }

  trackById(_: number, conv: Conversation): number {
    return conv.id;
  }

  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }
}
