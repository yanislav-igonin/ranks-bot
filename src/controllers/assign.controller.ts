import { Context } from 'telegraf';

export const AssignController = async (ctx: Context): Promise<void> => {
  console.log('DEBUG: ctx', ctx.update.message?.entities);
  ctx.reply('/assign not implemented');
};
