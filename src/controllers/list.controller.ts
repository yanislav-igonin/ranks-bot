import { TextContext } from '../modules/bot/interfaces';
import { ListService } from '../services';
import { RankToUserDao } from '../modules/db/dao';


export const ListController = async (ctx: TextContext): Promise<void> => {
  const rankToUserDao = new RankToUserDao();
  const service = new ListService({ dao: { rankToUser: rankToUserDao } });
  const response = await service.handle();
  ctx.reply(response.text);
};
