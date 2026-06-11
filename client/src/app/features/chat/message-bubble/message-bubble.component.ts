import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { Message, MessageSensitivity, ScrambleState } from '../../../core/models/message.model';
import { ScrambleTextComponent } from '../../../shared/scramble-text/scramble-text.component';
import { AudioService } from '../../../core/services/audio.service';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * A single ephemeral message rendered as a neon bubble wrapping the core
 * scramble-text animation. Cyan glow for the local user, magenta for the
 * contact. Tapping reveals; press-and-hold messages re-scramble on release.
 */
@Component({
  selector: 'app-message-bubble',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScrambleTextComponent],
  templateUrl: './message-bubble.component.html',
  styleUrl: './message-bubble.component.scss',
})
export class MessageBubbleComponent {
  @Input({ required: true }) message!: Message;
  @Input() isOwn = false;
  @Input() autoReveal = false;

  @Output() revealed = new EventEmitter<void>();
  @Output() scrambled = new EventEmitter<void>();
  @Output() stateChanged = new EventEmitter<ScrambleState>();

  private readonly audio = inject(AudioService);
  private readonly notifications = inject(NotificationService);

  readonly MessageSensitivity = MessageSensitivity;

  get isPressAndHold(): boolean {
    return this.message.sensitivity === MessageSensitivity.PressAndHold;
  }

  onRevealed(): void {
    this.audio.playReveal();
    this.notifications.vibrate(50);
    this.revealed.emit();
  }

  onScrambled(): void {
    this.scrambled.emit();
  }

  onStateChanged(state: ScrambleState): void {
    if (state === ScrambleState.Scrambling) {
      this.audio.playScramble();
    }
    this.stateChanged.emit(state);
  }
}
