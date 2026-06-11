import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Message, MessageSensitivity, MessageStatus } from '../../../core/models/message.model';
import { MessageBubbleComponent } from '../message-bubble/message-bubble.component';
import { currentUser } from '../../../core/state/app.state';

export interface ComposePayload {
  text: string;
  revealDurationMs: number;
  readDurationMs: number;
  scrambleDurationMs: number;
  sensitivity: MessageSensitivity;
}

/**
 * Compose surface shown when it is the user's turn. Offers a live PREVIEW of the
 * scramble/reveal animation and per-message timing + sensitivity settings before
 * the plaintext is encrypted and transmitted.
 */
@Component({
  selector: 'app-compose-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MessageBubbleComponent],
  templateUrl: './compose-panel.component.html',
  styleUrl: './compose-panel.component.scss',
})
export class ComposePanelComponent {
  @Input() set sending(value: boolean) {
    this._sending.set(value);
  }
  get sending(): boolean {
    return this._sending();
  }

  @Output() transmit = new EventEmitter<ComposePayload>();

  private readonly _sending = signal(false);

  readonly MessageSensitivity = MessageSensitivity;

  readonly text = signal('');
  readonly revealMs = signal(400);
  readonly readMs = signal(3000);
  readonly sensitivity = signal<MessageSensitivity>(MessageSensitivity.Standard);
  readonly tab = signal<'compose' | 'preview'>('compose');
  readonly settingsOpen = signal(false);

  readonly canTransmit = computed(() => this.text().trim().length > 0 && !this._sending());

  readonly previewMessage = computed<Message>(() => ({
    id: -1,
    conversationId: 0,
    senderId: currentUser()?.id ?? 0,
    senderLogin: currentUser()?.gitHubLogin ?? 'YOU',
    ciphertextBase64: '',
    ivBase64: '',
    status: MessageStatus.Pending,
    sentAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
    revealDurationMs: this.revealMs(),
    readDurationMs: this.readMs(),
    scrambleDurationMs: this.revealMs(),
    sensitivity: this.sensitivity(),
    plaintext: this.text(),
  }));

  setTab(tab: 'compose' | 'preview'): void {
    this.tab.set(tab);
  }

  toggleSettings(): void {
    this.settingsOpen.update((v) => !v);
  }

  setSensitivity(value: MessageSensitivity): void {
    this.sensitivity.set(value);
  }

  onText(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  onReveal(event: Event): void {
    this.revealMs.set(Number((event.target as HTMLInputElement).value));
  }

  onRead(event: Event): void {
    this.readMs.set(Number((event.target as HTMLInputElement).value));
  }

  send(): void {
    const text = this.text().trim();
    if (!text || this._sending()) {
      return;
    }
    this.transmit.emit({
      text,
      revealDurationMs: this.revealMs(),
      readDurationMs: this.readMs(),
      scrambleDurationMs: this.revealMs(),
      sensitivity: this.sensitivity(),
    });
  }

  reset(): void {
    this.text.set('');
    this.tab.set('compose');
  }
}
