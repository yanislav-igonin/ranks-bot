const parseInteger = (
  name: string,
  value: string | undefined,
  fallback?: number,
) => {
  if (value === undefined && fallback !== undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${name} must be an integer`);
  }
  return parsed;
};

const TgAppConfig = {
  port: parseInteger('TG_APP_PORT', process.env.TG_APP_PORT, 3000),
  staticDirectory: process.env.TG_APP_STATIC_DIR,
  devTelegramUserId: process.env.DEV_TELEGRAM_USER_ID
    ? parseInteger('DEV_TELEGRAM_USER_ID', process.env.DEV_TELEGRAM_USER_ID)
    : undefined,
};

export { TgAppConfig };
