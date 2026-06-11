import { Injectable } from '@angular/core';
import { IDBPDatabase, openDB } from 'idb';

const DB_NAME = 'cryptex';
const STORE_NAME = 'cryptex-keys';
const DEVICE_ID_KEY = 'cryptex-device-id';

interface StoredKeyRecord {
  userId: number;
  deviceId: string;
  keyPair: CryptoKeyPair;
  publicKeyJwk: JsonWebKey;
}

export interface EncryptedPayload {
  ciphertextBase64: string;
  ivBase64: string;
}

/**
 * Browser-side end-to-end encryption.
 *
 * Each device owns a persistent ECDH P-256 key pair stored in IndexedDB. The
 * private key is generated as non-extractable and never leaves the device — it
 * is structured-cloned into IndexedDB as an opaque CryptoKey. A per-conversation
 * AES-GCM shared secret is derived from our private key and the contact's public
 * key, then cached in memory keyed by conversation id.
 */
@Injectable({ providedIn: 'root' })
export class CryptoService {
  private dbPromise?: Promise<IDBPDatabase>;
  private readonly sharedSecrets = new Map<number, CryptoKey>();

  /**
   * Ensures a key pair exists for this user/device, persisting it if needed.
   * Returns the public key as a JWK, ready to register with the server.
   */
  async initializeKeys(userId: number): Promise<JsonWebKey> {
    const existing = await this.loadRecord(userId);
    if (existing) {
      return existing.publicKeyJwk;
    }

    const keyPair = (await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      false, // private key is non-extractable
      ['deriveKey', 'deriveBits'],
    )) as CryptoKeyPair;

    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

    const record: StoredKeyRecord = {
      userId,
      deviceId: this.getDeviceId(),
      keyPair,
      publicKeyJwk,
    };
    await this.saveRecord(record);
    return publicKeyJwk;
  }

  /** Retrieves this device's private key for the given user. */
  async getPrivateKey(userId: number): Promise<CryptoKey> {
    const record = await this.loadRecord(userId);
    if (!record) {
      throw new Error('No key pair found for this user. Call initializeKeys first.');
    }
    return record.keyPair.privateKey;
  }

  /** Returns the stored public key JWK for the user, generating keys if absent. */
  async exportPublicKeyJwk(userId: number): Promise<JsonWebKey> {
    const record = await this.loadRecord(userId);
    if (record) {
      return record.publicKeyJwk;
    }
    return this.initializeKeys(userId);
  }

  /** Imports a contact's ECDH public key (JWK or serialized JWK string). */
  async importPublicKey(jwk: JsonWebKey | string): Promise<CryptoKey> {
    const parsed: JsonWebKey = typeof jwk === 'string' ? JSON.parse(jwk) : jwk;
    return crypto.subtle.importKey(
      'jwk',
      parsed,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    );
  }

  /** Derives a 256-bit AES-GCM key from our private key and their public key. */
  async deriveSharedSecret(privateKey: CryptoKey, theirPublicKey: CryptoKey): Promise<CryptoKey> {
    return crypto.subtle.deriveKey(
      { name: 'ECDH', public: theirPublicKey },
      privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /** Encrypts plaintext with AES-GCM, returning base64 ciphertext + IV. */
  async encrypt(aesKey: CryptoKey, plaintext: string): Promise<EncryptedPayload> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);
    return {
      ciphertextBase64: this.toBase64(ciphertext),
      ivBase64: this.toBase64(iv.buffer),
    };
  }

  /** Decrypts an AES-GCM ciphertext (base64) using the given IV (base64). */
  async decrypt(aesKey: CryptoKey, ciphertextBase64: string, ivBase64: string): Promise<string> {
    const iv = this.fromBase64(ivBase64);
    const ciphertext = this.fromBase64(ciphertextBase64);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      aesKey,
      ciphertext,
    );
    return new TextDecoder().decode(plaintext);
  }

  /**
   * Resolves (deriving + caching as needed) the AES-GCM secret for a conversation,
   * given the current user's id and the contact's public key JWK.
   */
  async getSharedSecretForConversation(
    conversationId: number,
    userId: number,
    theirPublicKeyJwk: JsonWebKey | string,
  ): Promise<CryptoKey> {
    const cached = this.sharedSecrets.get(conversationId);
    if (cached) {
      return cached;
    }

    const privateKey = await this.getPrivateKey(userId);
    const theirPublicKey = await this.importPublicKey(theirPublicKeyJwk);
    const secret = await this.deriveSharedSecret(privateKey, theirPublicKey);

    this.sharedSecrets.set(conversationId, secret);
    return secret;
  }

  cacheSharedSecret(conversationId: number, key: CryptoKey): void {
    this.sharedSecrets.set(conversationId, key);
  }

  getCachedSharedSecret(conversationId: number): CryptoKey | undefined {
    return this.sharedSecrets.get(conversationId);
  }

  clearCache(): void {
    this.sharedSecrets.clear();
  }

  /** Stable per-device identifier persisted in localStorage. */
  getDeviceId(): string {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  /* ---- IndexedDB plumbing ---------------------------------------------- */

  private db(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });
    }
    return this.dbPromise;
  }

  private async loadRecord(userId: number): Promise<StoredKeyRecord | undefined> {
    const db = await this.db();
    return db.get(STORE_NAME, userId) as Promise<StoredKeyRecord | undefined>;
  }

  private async saveRecord(record: StoredKeyRecord): Promise<void> {
    const db = await this.db();
    await db.put(STORE_NAME, record, record.userId);
  }

  /* ---- base64 helpers --------------------------------------------------- */

  private toBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private fromBase64(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
