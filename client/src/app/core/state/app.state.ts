import { computed, signal } from '@angular/core';
import { Conversation } from '../models/conversation.model';
import { User } from '../models/user.model';

/** Global reactive application state (Angular Signals). */
export const conversations = signal<Conversation[]>([]);
export const activeConversationId = signal<number | null>(null);
export const currentUser = signal<User | null>(null);
export const connectionState = signal<string>('Disconnected');

export const activeConversation = computed(
  () => conversations().find((c) => c.id === activeConversationId()) ?? null,
);

export const pendingMessage = computed(() => activeConversation()?.pendingMessage ?? null);

export const isMyTurn = computed(
  () => activeConversation()?.currentTurnUserId === currentUser()?.id,
);

/* ---- State mutation helpers --------------------------------------------- */

export function setConversations(next: Conversation[]): void {
  conversations.set([...next].sort(sortByActivity));
}

export function upsertConversation(conversation: Conversation): void {
  conversations.update((list) => {
    const idx = list.findIndex((c) => c.id === conversation.id);
    const next = idx === -1 ? [...list, conversation] : list.map((c) => (c.id === conversation.id ? conversation : c));
    return next.sort(sortByActivity);
  });
}

export function patchConversation(id: number, patch: Partial<Conversation>): void {
  conversations.update((list) =>
    list.map((c) => (c.id === id ? { ...c, ...patch } : c)).sort(sortByActivity),
  );
}

function sortByActivity(a: Conversation, b: Conversation): number {
  return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
}
