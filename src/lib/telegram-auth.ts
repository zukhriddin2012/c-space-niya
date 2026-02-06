// SEC-010: Telegram WebApp initData validation
import crypto from 'crypto';

export interface TelegramValidationResult {
  valid: boolean;
  userId?: string;
  username?: string;
}

/**
 * Validates Telegram WebApp initData using HMAC-SHA256.
 * See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(initData: string): TelegramValidationResult {
  if (!initData) return { valid: false };

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return { valid: false };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false };

    params.delete('hash');

    // Sort and concatenate
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // HMAC-SHA256 with bot token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // SEC-010: Constant-time comparison to prevent timing attacks
    const hashBuffer = Buffer.from(hash, 'hex');
    const calcBuffer = Buffer.from(calculatedHash, 'hex');
    if (hashBuffer.length !== calcBuffer.length || !crypto.timingSafeEqual(hashBuffer, calcBuffer)) {
      return { valid: false };
    }

    // Extract user info
    const userStr = params.get('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return { valid: true, userId: String(user.id), username: user.username };
    }

    return { valid: true };
  } catch (error) {
    console.error('Telegram initData validation error:', error);
    return { valid: false };
  }
}
