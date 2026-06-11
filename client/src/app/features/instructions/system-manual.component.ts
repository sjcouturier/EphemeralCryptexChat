import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { TypewriterComponent } from '../../shared/typewriter/typewriter.component';

interface ManualSection {
  id: string;
  title: string;
  body: string;
}

@Component({
  selector: 'app-system-manual',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TypewriterComponent],
  templateUrl: './system-manual.component.html',
  styleUrl: './system-manual.component.scss',
})
export class SystemManualComponent {
  private readonly location = inject(Location);

  readonly sections: ManualSection[] = [
    {
      id: '01',
      title: 'FIRST BOOT',
      body: 'Sign in with GitHub. Your device generates a unique encryption key pair. Your private key never leaves this device. On a new device, a new key pair is created automatically.',
    },
    {
      id: '02',
      title: 'ACTIVE CHANNELS',
      body: 'Your home screen shows all open channels. Each channel is an independent encrypted conversation. Status shows whose turn it is to transmit.',
    },
    {
      id: '03',
      title: 'ESTABLISHING A NEW CHANNEL',
      body: "Tap [+ NEW CHANNEL], enter your contact's GitHub username. They will be notified of your request.",
    },
    {
      id: '04',
      title: 'SENDING A TRANSMISSION',
      body: 'Compose your message. Use [PREVIEW] to see exactly how it will appear to your contact. Adjust timing and sensitivity before transmitting.',
    },
    {
      id: '05',
      title: 'RECEIVING A TRANSMISSION',
      body: 'Messages arrive scrambled. Tap the bubble when you are ready to focus. The message will reveal itself, remain readable briefly, then disappear forever. Context lives only in your mind.',
    },
    {
      id: '06',
      title: 'PRESS-AND-HOLD MODE',
      body: 'For ultra-sensitive messages, the sender can require active contact with the screen. Release — the message instantly scrambles.',
    },
    {
      id: '07',
      title: 'SECURITY MODEL',
      body: 'All encryption happens on your device. The server stores only encrypted ciphertext it cannot read. Messages are automatically deleted after delivery plus a short grace period.\n\nThis system protects against casual observation and basic interception. It does not protect against compromised devices or OS-level attackers.',
    },
    {
      id: '08',
      title: 'DECRYPTION PLAYGROUND',
      body: 'Accessible from the menu. Test the scramble/reveal animation with any text. Tune timing to your preference.',
    },
    {
      id: '09',
      title: 'AUDIO',
      body: 'The interface has a cyberpunk audio layer — decrypt tones, incoming pings, and an ambient hum. Toggle in Settings.',
    },
    {
      id: '10',
      title: 'NOTIFICATIONS',
      body: 'Enable browser notifications to be alerted when a message arrives or when it becomes your turn to respond.',
    },
  ];

  headerLines(section: ManualSection): string[] {
    return [`[${section.id}] ${section.title}`];
  }

  headerDelay(index: number): number {
    return 400 + index * 550;
  }

  bodyDelay(index: number): number {
    return this.headerDelay(index) + 250;
  }

  back(): void {
    this.location.back();
  }
}
