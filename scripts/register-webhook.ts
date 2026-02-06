// SEC-009: Register Telegram webhook with secret_token
// Run: npx tsx scripts/register-webhook.ts

async function registerWebhook() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram-bot/webhook`
    : 'https://niya.cspace.uz/api/telegram-bot/webhook';
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN is required');
    process.exit(1);
  }

  if (!secret) {
    console.error('TELEGRAM_WEBHOOK_SECRET is required');
    process.exit(1);
  }

  console.log(`Registering webhook at: ${webhookUrl}`);
  console.log(`With secret_token: ${secret.substring(0, 4)}...`);

  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  const data = await response.json();
  console.log('Result:', JSON.stringify(data, null, 2));

  if (data.ok) {
    console.log('Webhook registered successfully!');
  } else {
    console.error('Failed to register webhook:', data.description);
    process.exit(1);
  }
}

registerWebhook().catch(console.error);
