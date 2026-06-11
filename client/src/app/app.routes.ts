import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/auth-callback/auth-callback.component').then(
        m => m.AuthCallbackComponent,
      ),
  },
  {
    path: 'channels',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/channels/channel-hub/channel-hub.component').then(
        m => m.ChannelHubComponent,
      ),
  },
  {
    path: 'chat/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/chat/conversation-stage/conversation-stage.component').then(
        m => m.ConversationStageComponent,
      ),
  },
  {
    path: 'playground',
    loadComponent: () =>
      import('./features/playground/playground.component').then(m => m.PlaygroundComponent),
  },
  {
    path: 'manual',
    loadComponent: () =>
      import('./features/instructions/system-manual.component').then(
        m => m.SystemManualComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '/channels',
  },
];
