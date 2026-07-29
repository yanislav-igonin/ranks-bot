import { TextContext } from '../modules/bot/interfaces';
import { ChangelogService } from '../services';
import { ChangelogDao } from '../modules/db/dao';
import { replyInChunks } from './reply-in-chunks';

export const ChangelogController = async (ctx: TextContext) => {
  const changelogDao = new ChangelogDao();

  const service = new ChangelogService({
    dao: { changelog: changelogDao },
  });

  const response = await service.handle();
  await replyInChunks(ctx, response.text);
};
