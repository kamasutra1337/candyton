/**
 * Authentication helpers.
 *
 * - {@link TokenAuth} issues opaque bearer tokens mapped to player ids, kept in
 *   memory. In production these would be short-lived signed JWTs, but the
 *   route-facing contract (issue / resolve) stays identical.
 * - {@link verifyTelegramInitData} implements Telegram's WebApp `initData`
 *   signature check (HMAC-SHA256) so a real Mini App session can be validated.
 */

import { createHmac, randomBytes } from 'node:crypto';

export class TokenAuth {
  private readonly tokens = new Map<string, string>();

  /** Mint a fresh opaque token bound to a player id. */
  issue(playerId: string): string {
    const token = randomBytes(24).toString('hex');
    this.tokens.set(token, playerId);
    return token;
  }

  /** Resolve a token to its player id, or undefined if unknown. */
  resolve(token: string): string | undefined {
    return this.tokens.get(token);
  }
}

/** Extract a bearer token from an Authorization header value. */
export function bearerFromHeader(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return undefined;
  return value.trim();
}

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramVerifyResult {
  ok: boolean;
  reason?: string;
  user?: TelegramUser;
}

/**
 * Validate Telegram WebApp `initData` per the official spec:
 *   secret = HMAC_SHA256(key = "WebAppData", msg = botToken)
 *   hash   = HMAC_SHA256(key = secret, msg = data_check_string)
 * where data_check_string is every `key=value` pair except `hash`, sorted by
 * key and joined by "\n".
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
): TelegramVerifyResult {
  if (!botToken) return { ok: false, reason: 'server missing BOT_TOKEN' };
  if (!initData) return { ok: false, reason: 'missing initData' };

  const params = new URLSearchParams(initData);
  const providedHash = params.get('hash');
  if (!providedHash) return { ok: false, reason: 'missing hash' };

  const pairs: string[] = [];
  for (const [key, value] of params) {
    if (key === 'hash') continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = createHmac('sha256', secret).update(dataCheckString).digest('hex');

  if (computed !== providedHash) return { ok: false, reason: 'bad signature' };

  let user: TelegramUser | undefined;
  const rawUser = params.get('user');
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as TelegramUser;
    } catch {
      return { ok: false, reason: 'malformed user payload' };
    }
  }
  return { ok: true, user };
}
