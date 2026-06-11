import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { User } from '../models/user.model';
import { currentUser } from '../state/app.state';

const TOKEN_KEY = 'cryptex-jwt';

interface JwtPayload {
  sub: string;
  login: string;
  avatar?: string;
  exp?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  /** The authenticated user (shared with global app state). */
  readonly currentUser = currentUser;

  constructor() {
    // Rehydrate from a previously stored token on startup.
    const token = this.getToken();
    if (token && !this.isExpired(token)) {
      const user = this.userFromToken(token);
      if (user) {
        currentUser.set(user);
      }
    } else if (token) {
      this.logout();
    }
  }

  /** Redirects the browser to the backend GitHub OAuth entry point. */
  login(): void {
    window.location.href = `${APP_CONFIG.apiUrl}/auth/login`;
  }

  /**
   * Handles the OAuth callback: pulls the JWT from the query string, persists it,
   * decodes the user and updates state. Returns the user, or null on failure.
   */
  handleCallback(token: string | null): User | null {
    if (!token) {
      return null;
    }
    localStorage.setItem(TOKEN_KEY, token);
    const user = this.userFromToken(token);
    if (user) {
      currentUser.set(user);
    }
    return user;
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isExpired(token);
  }

  /** Refreshes the current user from the server (authoritative source). */
  async fetchCurrentUser(): Promise<User | null> {
    try {
      const user = await firstValueFrom(this.http.get<User>(`${APP_CONFIG.apiUrl}/auth/me`));
      currentUser.set(user);
      return user;
    } catch {
      return null;
    }
  }

  private userFromToken(token: string): User | null {
    const payload = this.decodeToken(token);
    if (!payload) {
      return null;
    }
    return {
      id: Number(payload.sub),
      gitHubLogin: payload.login,
      avatarUrl: payload.avatar ?? '',
    };
  }

  private isExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload?.exp) {
      return false;
    }
    return payload.exp * 1000 <= Date.now();
  }

  private decodeToken(token: string): JwtPayload | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      return JSON.parse(json) as JwtPayload;
    } catch {
      return null;
    }
  }
}
