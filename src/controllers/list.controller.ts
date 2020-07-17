import { TextContext } from '../modules/bot/interfaces';
import { ListService } from '../services';
import { RankToUserDao, RankDao } from '../modules/db/dao';


export const ListController = async (ctx: TextContext): Promise<void> => {
  const rankToUserDao = new RankToUserDao();
  const rankDao = new RankDao();
  const service = new ListService({
    dao: { rankToUser: rankToUserDao, rank: rankDao },
  });
  const response = await service.handle();
  ctx.reply(response.text);
};
