import type { TextContext } from '../modules/bot/interfaces';
import { ChangelogDao, RankDao, RankToUserDao, UserDao } from '../modules/db/dao';
import { AssignService } from '../services';

export const AssignController = async (ctx: TextContext) => {
  const assignText = ctx.update.message.text.slice(
    (ctx.update.message.entities?.[0]?.length ?? 0) + 1,
    ctx.update.message.text.length,
  );

  const userId = ctx.update.message.from.id;

  const regexp = /(\d+) (\S+) ?(\D+)?/;

  const matches = assignText.match(regexp);
  const rankId = matches?.[1] ? parseInt(matches[1], 10) : NaN;
  const rankUsername = matches?.[2] ? matches[2].replace('@', '') : '';
  const rankComment = matches?.[3] ?? '';

  const rankDao = new RankDao();
  const changelogDao = new ChangelogDao();
  const rankToUserDao = new RankToUserDao();
  const userDao = new UserDao();

  const service = new AssignService({
    user: { id: userId },
    rank: {
      id: rankId,
      username: rankUsername,
      comment: rankComment,
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
