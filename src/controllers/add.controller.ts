import { TextContext } from '../modules/bot/interfaces';
import { AddService } from '../services';
import { RankDao } from '../modules/db/dao';

export const AddController = async (ctx: TextContext): Promise<void> => {
  const rankTitle = ctx.update.message.text.slice(
    ctx.update.message.entities[0].length + 1,
    ctx.update.message.text.length,
  );
  const rankDao = new RankDao();
  const service = new AddService({
    rank: { title: rankTitle },
    dao: { rank: rankDao },
  });
  const response = await service.handle();
  ctx.reply(response.text);
};
