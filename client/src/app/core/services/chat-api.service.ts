import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { Conversation, DeviceKey } from '../models/conversation.model';
import { Message, SendMessageDto } from '../models/message.model';
import { User } from '../models/user.model';

/** Thin wrapper over the backend REST API. */
@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private readonly http = inject(HttpClient);
  private readonly base = APP_CONFIG.apiUrl;

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.base}/auth/me`);
  }

  getUserByLogin(login: string): Observable<User> {
    return this.http.get<User>(`${this.base}/users/${encodeURIComponent(login)}`);
  }

  registerDeviceKey(deviceId: string, publicKeyJwk: string): Observable<DeviceKey> {
    return this.http.post<DeviceKey>(`${this.base}/users/keys`, { deviceId, publicKeyJwk });
  }

  getUserKeys(login: string): Observable<DeviceKey[]> {
    return this.http.get<DeviceKey[]>(`${this.base}/users/${encodeURIComponent(login)}/keys`);
  }

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.base}/conversations`);
  }

  getConversation(id: number): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.base}/conversations/${id}`);
  }

  startConversation(responderLogin: string): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.base}/conversations`, { responderLogin });
  }

  getMessage(id: number): Observable<Message> {
    return this.http.get<Message>(`${this.base}/messages/${id}`);
  }

  sendMessage(dto: SendMessageDto): Observable<Message> {
    return this.http.post<Message>(`${this.base}/messages`, dto);
  }

  acknowledgeDelivery(id: number): Observable<Message> {
    return this.http.post<Message>(`${this.base}/messages/${id}/delivered`, {});
  }

  acknowledgeRead(id: number): Observable<Message> {
    return this.http.post<Message>(`${this.base}/messages/${id}/read`, {});
  }
}
