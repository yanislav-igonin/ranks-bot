import type { TextContext } from '../modules/bot/interfaces';
import { ChangelogDao, RankDao, RankToUserDao, UserDao } from '../modules/db/dao';
import { UnassignService } from '../services';

export const UnassignController = async (ctx: TextContext) => {
  const unassignText = ctx.update.message.text.slice(
    (ctx.update.message.entities?.[0]?.length ?? 0) + 1,
    ctx.update.message.text.length,
  );

  const userId = ctx.update.message.from.id;

  const regexp = /(\d+) (\S+)/;

  const matches = unassignText.match(regexp);
  const rankId = matches?.[1] ? parseInt(matches[1], 10) : NaN;
  const rankUsername = matches?.[2] ? matches[2].replace('@', '') : '';

  const rankDao = new RankDao();
  const changelogDao = new ChangelogDao();
  const rankToUserDao = new RankToUserDao();
  const userDao = new UserDao();

  const service = new UnassignService({
    user: { id: userId },
    rank: {
      id: rankId,
      username: rankUsername,
    },
    dao: {
      rank: rankDao,
      changelog: changelogDao,
      rankToUser: rankToUserDao,
      user: userDao,
    },
  });

  const response = await service.handle();

  ctx.reply(response.text);
};
