import { TextContext } from '../modules/bot/interfaces';
import { DeleteService } from '../services';
import { RankDao, ChangelogDao } from '../modules/db/dao';

export const DeleteController = async (ctx: TextContext): Promise<void> => {
  const rankText = ctx.update.message.text.slice(
    ctx.update.message.entities[0].length + 1,
    ctx.update.message.text.length,
  );
  const rankId = parseInt(rankText, 10);

  const rankDao = new RankDao();
  const changelogDao = new ChangelogDao();

  const service = new DeleteService({
    user: { id: ctx.update.message.from.id },
    rank: { id: rankId },
    dao: { rank: rankDao, changelog: changelogDao },
  });

  const response = await service.handle();
  ctx.reply(response.text);
};
