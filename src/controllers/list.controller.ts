import type { TextContext } from '../modules/bot/interfaces';
import { RankDao, RankToUserDao } from '../modules/db/dao';
import { ListService } from '../services';
import { replyInChunks } from './reply-in-chunks';

export const ListController = async (ctx: TextContext) => {
  const rankToUserDao = new RankToUserDao();
  const rankDao = new RankDao();
  const service = new ListService({
    dao: { rankToUser: rankToUserDao, rank: rankDao },
  });
  const response = await service.handle();
  await replyInChunks(ctx, response.text);
};
