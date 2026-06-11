import { Message } from './message.model';
import { User } from './user.model';

export interface Conversation {
  id: number;
  initiator: User;
  responder: User;
  status: 'Active' | 'Closed';
  currentTurnUserId: number | null;
  lastActivityAt: string;
  pendingMessage: Message | null;
}

/** Public key registered by a contact's device, used for ECDH key agreement. */
export interface DeviceKey {
  deviceId: string;
  publicKeyJwk: string;
  registeredAt: string;
  lastSeenAt: string;
}
