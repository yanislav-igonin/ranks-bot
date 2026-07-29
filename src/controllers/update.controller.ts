import type { TextContext } from '../modules/bot/interfaces';
import { ChangelogDao, RankDao } from '../modules/db/dao';
import { UpdateService } from '../services';

export const UpdateController = async (ctx: TextContext) => {
  const rankText = ctx.update.message.text.slice(
    (ctx.update.message.entities?.[0]?.length ?? 0) + 1,
    ctx.update.message.text.length,
  );

  const regexp = /(\d+) (\D+)/;
  const matches = rankText.match(regexp);
  const rankId = matches?.[1] ? parseInt(matches[1], 10) : NaN;
  const rankNextTitle = matches?.[2] ? matches[2].trim() : '';

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
