import { TextContext } from '../modules/bot/interfaces';
import { ListService } from '../services';
import { RankToUserDao, RankDao } from '../modules/db/dao';
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
