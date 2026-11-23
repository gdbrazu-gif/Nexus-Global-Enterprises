export const DEFAULT_BUILT_IN_SHARE_URL =
  'https://ais-pre-aexzoujixixlvigsbkzvcu-243544951738.europe-west2.run.app';

export function getBuiltInShareBaseUrl(): string {
  const envUrl = import.meta.env?.VITE_SHARED_APP_URL;
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    if (origin.includes('://ais-dev-')) {
      return origin.replace('://ais-dev-', '://ais-pre-');
    }
    if (origin.includes('://ais-pre-')) {
      return origin;
    }
    if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin;
    }
  }
  return DEFAULT_BUILT_IN_SHARE_URL;
}

export function getBuiltInShareHostname(): string {
  try {
    return new URL(getBuiltInShareBaseUrl()).hostname;
  } catch {
    return 'ais-pre-aexzoujixixlvigsbkzvcu-243544951738.europe-west2.run.app';
  }
}
