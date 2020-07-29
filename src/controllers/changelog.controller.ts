import { TextContext } from '../modules/bot/interfaces';
import { ChangelogService } from '../services';
import { ChangelogDao } from '../modules/db/dao';

export const ChangelogController = async (ctx: TextContext): Promise<void> => {
  const changelogDao = new ChangelogDao();

  const service = new ChangelogService({
    dao: { changelog: changelogDao },
  });

  const response = await service.handle();
  ctx.reply(response.text);
};
