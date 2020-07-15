import { Context } from 'telegraf';

export const StartController = async (ctx: Context): Promise<void> => {
  console.log(ctx.update.message?.from);
  ctx.reply(`${new Date().toLocaleString()} - start`);
};
