import type { TextContext } from '../modules/bot/interfaces';
import { ChangelogDao, RankDao } from '../modules/db/dao';
import { AddService } from '../services';

export const AddController = async (ctx: TextContext) => {
  const rankTitle = ctx.update.message.text.slice(
    ctx.update.message.entities[0].length + 1,
    ctx.update.message.text.length,
  );

  const rankDao = new RankDao();
  const changelogDao = new ChangelogDao();

  const service = new AddService({
    user: { id: ctx.update.message.from.id },
    rank: { title: rankTitle },
    dao: { rank: rankDao, changelog: changelogDao },
  });

  const response = await service.handle();
  ctx.reply(response.text);
};
