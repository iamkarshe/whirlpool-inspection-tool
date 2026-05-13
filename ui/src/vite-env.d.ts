/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_BUILD: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ALLOW_MANUAL_CODE: string;
  readonly VITE_ALLOW_DEFAULT_LOCATION: string;
  readonly VITE_APP_EMAIL: string;
  readonly VITE_APP_PASSWORD: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Navigator {
  readonly standalone?: boolean;
}

interface Window {
  readonly __WHIRLPOOL_ENV__?: {
    readonly VITE_API_BASE_URL?: string;
  };
}
