import { Context } from 'telegraf';

export const StartController = async (ctx: Context) => {
  await ctx.reply('Здорова, бандиты');
};
