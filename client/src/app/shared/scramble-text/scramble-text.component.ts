import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { MessageSensitivity, ScrambleState } from '../../core/models/message.model';

export const GLYPH_SETS: Record<string, string> = {
  Standard: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%@$&*!?',
  Symbols: '#%@$&*!?+=-/\\|<>[]{}()~^¬¦×÷',
  Matrix: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇ0123456789',
};

const FLICKER_INTERVAL_MS = 50;

/**
 * Character-morphing "slot-machine" decryption animation. Each scrambleable
 * character flickers through random glyphs, then locks into its real value with
 * a neon pulse. Drives the whole reveal/read/scramble lifecycle via a single
 * requestAnimationFrame loop (kept outside the Angular zone for 60fps).
 */
@Component({
  selector: 'app-scramble-text',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scramble-text.component.html',
  styleUrl: './scramble-text.component.scss',
})
export class ScrambleTextComponent implements OnInit, OnChanges, OnDestroy {
  @Input() text = '';
  @Input() revealDurationMs = 400;
  @Input() readDurationMs = 3000;
  @Input() scrambleDurationMs = 400;
  @Input() sensitivity: MessageSensitivity = MessageSensitivity.Standard;
  @Input() autoReveal = false;
  @Input() loop = false;
  @Input() glyphSet = 'Standard';

  @Output() stateChanged = new EventEmitter<ScrambleState>();
  @Output() revealed = new EventEmitter<void>();
  @Output() scrambled = new EventEmitter<void>();

  readonly ScrambleState = ScrambleState;
  readonly scrambleState = signal<ScrambleState>(ScrambleState.Scrambled);
  readonly displayChars = signal<string[]>([]);
  readonly lockedChars = signal<boolean[]>([]);

  private readonly zone = inject(NgZone);

  private chars: string[] = [];
  private locked: boolean[] = [];
  private fixed: boolean[] = [];
  private revealDelays: number[] = [];
  private unlockDelays: number[] = [];

  private rafId: number | null = null;
  private running = false;
  private phaseStart = 0;
  private lastFlicker = 0;
  private readTimer: ReturnType<typeof setTimeout> | null = null;
  private pointerHeld = false;

  get isPressAndHold(): boolean {
    return this.sensitivity === MessageSensitivity.PressAndHold;
  }

  ngOnInit(): void {
    this.initChars();
    if (this.autoReveal) {
      // Kick off the reveal shortly after mount so the scrambled state is visible first.
      setTimeout(() => this.triggerReveal(), 250);
    } else {
      this.startLoop();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['text'] && !changes['text'].firstChange) {
      this.reset();
    }
  }

  ngOnDestroy(): void {
    this.stopLoop();
    this.clearReadTimer();
  }

  /** Public API — begin revealing (used by tap handlers, preview and playground). */
  triggerReveal(): void {
    if (this.scrambleState() === ScrambleState.Revealing || this.scrambleState() === ScrambleState.Readable) {
      return;
    }
    this.assignRevealDelays();
    this.phaseStart = performance.now();
    this.lastFlicker = 0;
    this.setState(ScrambleState.Revealing);
    this.startLoop();
  }

  /** Public API — begin scrambling back into noise. */
  triggerScramble(): void {
    if (this.scrambleState() === ScrambleState.Scrambled || this.scrambleState() === ScrambleState.Scrambling) {
      return;
    }
    this.clearReadTimer();
    this.assignUnlockDelays();
    this.phaseStart = performance.now();
    this.lastFlicker = 0;
    this.setState(ScrambleState.Scrambling);
    this.startLoop();
  }

  /** Public API — reset to a fully scrambled state. */
  reset(): void {
    this.clearReadTimer();
    this.initChars();
    this.setState(ScrambleState.Scrambled);
    this.startLoop();
    if (this.autoReveal) {
      setTimeout(() => this.triggerReveal(), 250);
    }
  }

  /* ---- Pointer interaction --------------------------------------------- */

  onPointerDown(): void {
    this.pointerHeld = true;
    const state = this.scrambleState();
    if (state === ScrambleState.Scrambled || state === ScrambleState.Scrambling) {
      this.triggerReveal();
    }
  }

  onPointerUp(): void {
    this.pointerHeld = false;
    if (this.isPressAndHold) {
      this.triggerScramble();
    }
  }

  onPointerCancel(): void {
    this.onPointerUp();
  }

  /* ---- Animation engine ------------------------------------------------- */

  private initChars(): void {
    const source = this.text ?? '';
    this.chars = source.split('');
    this.fixed = this.chars.map((c) => !this.isScrambleable(c));
    this.locked = this.chars.map((_, i) => this.fixed[i]);
    const display = this.chars.map((c, i) => (this.fixed[i] ? c : this.randomGlyph()));
    this.displayChars.set(display);
    this.lockedChars.set([...this.locked]);
  }

  private startLoop(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.zone.runOutsideAngular(() => {
      const step = (now: number) => {
        if (!this.running) {
          return;
        }
        this.tick(now);
        this.rafId = requestAnimationFrame(step);
      };
      this.rafId = requestAnimationFrame(step);
    });
  }

  private stopLoop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick(now: number): void {
    switch (this.scrambleState()) {
      case ScrambleState.Scrambled:
        this.flicker(now);
        break;

      case ScrambleState.Revealing: {
        const elapsed = now - this.phaseStart;
        let changed = false;
        for (let i = 0; i < this.chars.length; i++) {
          if (!this.fixed[i] && !this.locked[i] && elapsed >= this.revealDelays[i]) {
            this.locked[i] = true;
            changed = true;
          }
        }
        if (changed) {
          this.commitLockState();
        }
        this.flicker(now);
        if (this.allScrambleableLocked()) {
          this.beginRead();
        }
        break;
      }

      case ScrambleState.Scrambling: {
        const elapsed = now - this.phaseStart;
        let changed = false;
        for (let i = 0; i < this.chars.length; i++) {
          if (!this.fixed[i] && this.locked[i] && elapsed >= this.unlockDelays[i]) {
            this.locked[i] = false;
            changed = true;
          }
        }
        if (changed) {
          this.commitLockState();
        }
        this.flicker(now);
        if (this.allScrambleableUnlocked()) {
          this.completeScramble();
        }
        break;
      }

      case ScrambleState.Readable:
        // Static — nothing to animate; the read timer (or pointer) drives the exit.
        break;
    }
  }

  /** Re-randomizes every unlocked, scrambleable glyph (throttled to ~20fps). */
  private flicker(now: number): void {
    if (now - this.lastFlicker < FLICKER_INTERVAL_MS) {
      return;
    }
    this.lastFlicker = now;
    const next = this.displayChars().slice();
    for (let i = 0; i < this.chars.length; i++) {
      if (this.fixed[i] || this.locked[i]) {
        next[i] = this.chars[i];
      } else {
        next[i] = this.randomGlyph();
      }
    }
    this.displayChars.set(next);
  }

  private commitLockState(): void {
    const display = this.displayChars().slice();
    for (let i = 0; i < this.chars.length; i++) {
      if (this.locked[i]) {
        display[i] = this.chars[i];
      }
    }
    this.displayChars.set(display);
    this.lockedChars.set([...this.locked]);
  }

  private beginRead(): void {
    this.commitLockState();
    this.setState(ScrambleState.Readable);
    this.stopLoop();
    this.revealed.emit();

    if (this.isPressAndHold) {
      // Stay readable only while the pointer is held down.
      if (!this.pointerHeld) {
        this.triggerScramble();
      }
      return;
    }

    this.clearReadTimer();
    this.readTimer = setTimeout(() => {
      this.zone.run(() => this.triggerScramble());
    }, this.readDurationMs);
  }

  private completeScramble(): void {
    this.setState(ScrambleState.Scrambled);
    this.scrambled.emit();
    if (this.loop) {
      setTimeout(() => this.triggerReveal(), 600);
    }
  }

  private setState(state: ScrambleState): void {
    this.scrambleState.set(state);
    this.stateChanged.emit(state);
  }

  private assignRevealDelays(): void {
    const max = this.revealDurationMs * 0.7;
    this.revealDelays = this.chars.map(() => Math.random() * max);
  }

  private assignUnlockDelays(): void {
    this.unlockDelays = this.chars.map(() => Math.random() * this.scrambleDurationMs);
  }

  private allScrambleableLocked(): boolean {
    for (let i = 0; i < this.chars.length; i++) {
      if (!this.fixed[i] && !this.locked[i]) {
        return false;
      }
    }
    return true;
  }

  private allScrambleableUnlocked(): boolean {
    for (let i = 0; i < this.chars.length; i++) {
      if (!this.fixed[i] && this.locked[i]) {
        return false;
      }
    }
    return true;
  }

  private isScrambleable(ch: string): boolean {
    return /[A-Za-z0-9]/.test(ch);
  }

  private randomGlyph(): string {
    const set = GLYPH_SETS[this.glyphSet] ?? GLYPH_SETS['Standard'];
    return set.charAt(Math.floor(Math.random() * set.length));
  }

  private clearReadTimer(): void {
    if (this.readTimer !== null) {
      clearTimeout(this.readTimer);
      this.readTimer = null;
    }
  }
}
