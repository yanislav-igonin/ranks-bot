import { Middleware } from 'telegraf';
import { AuthConfig } from '../config';
import { TextContext } from '../modules/bot/interfaces';

export const AuthMiddleware: Middleware<TextContext> = async (
  ctx,
  next,
): Promise<void> => {
  if (!AuthConfig.users.includes(ctx.update.message.from.id)) {
    await ctx.reply('Соси бибу, пес');
    return;
  }
  await next();
};
