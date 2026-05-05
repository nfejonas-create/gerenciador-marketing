import crypto from 'crypto';

export function createMetricsToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function isValidMetricsToken(settings: any, token: string) {
  return Boolean(settings?.metricsWebhookToken && token && settings.metricsWebhookToken === token);
}
