import { TextContext } from '../modules/bot/interfaces';
import { UpdateService } from '../services';
import { RankDao, ChangelogDao } from '../modules/db/dao';

export const UpdateController = async (ctx: TextContext): Promise<void> => {
  const rankText = ctx.update.message.text.slice(
    ctx.update.message.entities[0].length + 1,
    ctx.update.message.text.length,
  );

  const regexp = /(\d+) (\D+)/;
  const matches = rankText.match(regexp);
  const rankId = matches && matches[1] ? parseInt(matches[1], 10) : NaN;
  const rankNextTitle = matches && matches[2] ? matches[2].trim() : '';

  const rankDao = new RankDao();
  const changelogDao = new ChangelogDao();

  const service = new UpdateService({
    user: { id: ctx.update.message.from.id },
    rank: { id: rankId, nextTitle: rankNextTitle },
    dao: { rank: rankDao, changelog: changelogDao },
  });

  const response = await service.handle();
  ctx.reply(response.text);
};
