import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';

/**
 * Types an array of lines character-by-character, leaving completed lines on
 * screen. Used for the login "boot" sequence and the system manual headers.
 */
@Component({
  selector: 'app-typewriter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (line of completed(); track $index) {
      <div class="tw-line">{{ line }}</div>
    }
    @if (current() !== null) {
      <div class="tw-line">
        {{ current() }}<span class="tw-cursor" [class.hidden]="!showCursor">▌</span>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .tw-line {
        white-space: pre-wrap;
      }
      .tw-cursor {
        animation: tw-blink 1s steps(1) infinite;
      }
      .tw-cursor.hidden {
        display: none;
      }
      @keyframes tw-blink {
        50% {
          opacity: 0;
        }
      }
    `,
  ],
})
export class TypewriterComponent implements OnInit, OnDestroy {
  @Input() lines: string[] = [];
  @Input() speed = 40;
  @Input() startDelay = 200;
  @Input() lineDelay = 350;
  @Input() showCursor = true;

  readonly completed = signal<string[]>([]);
  readonly current = signal<string | null>(null);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private lineIndex = 0;
  private charIndex = 0;

  ngOnInit(): void {
    this.timer = setTimeout(() => this.typeNextChar(), this.startDelay);
  }

  ngOnDestroy(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
  }

  private typeNextChar(): void {
    if (this.lineIndex >= this.lines.length) {
      this.current.set(null);
      return;
    }

    const line = this.lines[this.lineIndex];
    this.charIndex++;
    this.current.set(line.slice(0, this.charIndex));

    if (this.charIndex >= line.length) {
      // Line complete — commit it and advance.
      this.completed.update((c) => [...c, line]);
      this.lineIndex++;
      this.charIndex = 0;
      this.current.set('');
      this.timer = setTimeout(() => this.typeNextChar(), this.lineDelay);
    } else {
      this.timer = setTimeout(() => this.typeNextChar(), this.speed);
    }
  }
}
