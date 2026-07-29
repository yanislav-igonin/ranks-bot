import type { Middleware } from 'telegraf';
import { AppConfig, AuthConfig } from '../config';
import type { TextContext } from '../modules/bot/interfaces';

export const AuthMiddleware: Middleware<TextContext> = async (ctx, next) => {
  if (!AuthConfig.users.includes(ctx.update.message.from.id)) {
    await ctx.reply('Соси бибу, пес');
    return;
  }

  if (
    AppConfig.env === 'production' &&
    ctx.update.message.chat.id !== -1001230506485
  ) {
    await ctx.reply('Действия доступны только в чате, шакал');
    return;
  }

  await next();
};
