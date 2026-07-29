import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { type ApiClient, ApiError, App, type TelegramBridge } from './App.js';
import './styles.css';

interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  isVersionAtLeast(version: string): boolean;
  BackButton: {
    show(): void;
    hide(): void;
    onClick(handler: () => void): void;
    offClick(handler: () => void): void;
  };
  HapticFeedback: {
    selectionChanged(): void;
    notificationOccurred(type: 'success' | 'error' | 'warning'): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

const webApp = window.Telegram?.WebApp;
const supportsInteractiveBridge = webApp?.isVersionAtLeast('6.1') ?? false;

const telegram: TelegramBridge = {
  ready: () => webApp?.ready(),
  expand: () => webApp?.expand(),
  backButton: {
    show: () => {
      if (supportsInteractiveBridge) webApp?.BackButton.show();
    },
    hide: () => {
      if (supportsInteractiveBridge) webApp?.BackButton.hide();
    },
    onClick: (handler) => {
      if (supportsInteractiveBridge) webApp?.BackButton.onClick(handler);
    },
    offClick: (handler) => {
      if (supportsInteractiveBridge) webApp?.BackButton.offClick(handler);
    },
  },
  haptic: {
    selectionChanged: () => {
      if (supportsInteractiveBridge) webApp?.HapticFeedback.selectionChanged();
    },
    notificationOccurred: (type) => {
      if (supportsInteractiveBridge) {
        webApp?.HapticFeedback.notificationOccurred(type);
      }
    },
  },
};

const request = async <ResponseBody,>(
  path: string,
  init?: RequestInit,
): Promise<ResponseBody> => {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (webApp?.initData) {
    headers.set('Authorization', `tma ${webApp.initData}`);
  }

  const response = await fetch(path, { ...init, headers });
  const body = (await response.json()) as ResponseBody & { error?: string };
  if (!response.ok) {
    throw new ApiError(response.status, body.error ?? 'Request failed');
  }
  return body;
};

const api: ApiClient = {
  getState: () => request('/api/state'),
  assign: (rankId, userId, comment) =>
    request(`/api/ranks/${rankId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ userId, comment }),
    }),
  createRank: (title) =>
    request('/api/ranks', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  deleteRank: (rankId) =>
    request(`/api/ranks/${rankId}`, {
      method: 'DELETE',
    }),
  unassign: (assignmentId) =>
    request(`/api/assignments/${assignmentId}`, {
      method: 'DELETE',
    }),
};

const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing');

createRoot(root).render(
  <StrictMode>
    <App api={api} telegram={telegram} />
  </StrictMode>,
);
