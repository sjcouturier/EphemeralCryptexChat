import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Location } from '@angular/common';
import { AmbientBackgroundComponent } from '../../shared/ambient-background/ambient-background.component';
import {
  GLYPH_SETS,
  ScrambleTextComponent,
} from '../../shared/scramble-text/scramble-text.component';
import { MessageSensitivity } from '../../core/models/message.model';

@Component({
  selector: 'app-playground',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmbientBackgroundComponent, ScrambleTextComponent],
  templateUrl: './playground.component.html',
  styleUrl: './playground.component.scss',
})
export class PlaygroundComponent {
  @ViewChild('sc') scramble?: ScrambleTextComponent;

  private readonly location = inject(Location);

  readonly MessageSensitivity = MessageSensitivity;
  readonly glyphSets = Object.keys(GLYPH_SETS);

  readonly text = signal('DECRYPT THE SIGNAL · 2049');
  readonly revealMs = signal(500);
  readonly readMs = signal(3000);
  readonly glyphSet = signal('Standard');
  readonly sensitivity = signal<MessageSensitivity>(MessageSensitivity.Standard);
  readonly looping = signal(false);

  onText(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  onReveal(event: Event): void {
    this.revealMs.set(Number((event.target as HTMLInputElement).value));
  }

  onRead(event: Event): void {
    this.readMs.set(Number((event.target as HTMLInputElement).value));
  }

  setGlyphSet(name: string): void {
    this.glyphSet.set(name);
  }

  setSensitivity(value: MessageSensitivity): void {
    this.sensitivity.set(value);
  }

  doReveal(): void {
    this.scramble?.triggerReveal();
  }

  doScramble(): void {
    this.scramble?.triggerScramble();
  }

  toggleLoop(): void {
    const next = !this.looping();
    this.looping.set(next);
    if (next) {
      this.scramble?.triggerReveal();
    }
  }

  back(): void {
    this.location.back();
  }
}
