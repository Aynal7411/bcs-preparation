export async function sendSms({ to, message }) {
  if (process.env.SMS_PROVIDER === 'twilio') {
    return { provider: 'twilio', to, message, status: 'queued' };
  }

  if (process.env.SMS_PROVIDER === 'greenweb') {
    return { provider: 'greenweb', to, message, status: 'queued' };
  }

  return { provider: 'none', to, message, status: 'skipped' };
}
