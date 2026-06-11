export enum MessageStatus {
  Pending = 0,
  Delivered = 1,
  Read = 2,
  Expired = 3,
}

export enum MessageSensitivity {
  Standard = 0,
  PressAndHold = 1,
}

export enum ScrambleState {
  Scrambled,
  Revealing,
  Readable,
  Scrambling,
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderLogin: string;
  ciphertextBase64: string;
  ivBase64: string;
  status: MessageStatus;
  sentAt: string;
  expiresAt: string;
  revealDurationMs: number;
  readDurationMs: number;
  scrambleDurationMs: number;
  sensitivity: MessageSensitivity;
  /** Client-side only — decrypted plaintext (never sent to the server). */
  plaintext?: string;
}

/** Payload sent to the server when transmitting a message. */
export interface SendMessageDto {
  conversationId: number;
  ciphertextBase64: string;
  ivBase64: string;
  revealDurationMs: number;
  readDurationMs: number;
  scrambleDurationMs: number;
  sensitivity: MessageSensitivity;
}
