import { Context } from 'telegraf';

export const StartController = async (ctx: Context): Promise<void> => {
  await ctx.reply('Здорова, бандиты');
};
