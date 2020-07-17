import { ListResponse } from '../responses';
import { ListResponseData } from '../responses/list.response';
import { RankToUserDao } from '../modules/db/dao';

interface ListServiceData {
  dao: { rankToUser: RankToUserDao };
}

export class ListService {
  private dao: { rankToUser: RankToUserDao};

  public constructor(data: ListServiceData) {
    this.dao = data.dao;
  }

  public async handle(): Promise<ListResponse> {
    const ranksToUsers = await this.dao.rankToUser.getRanksToUsers();

    const usersRanks = ranksToUsers
      .reduce((acc: ListResponseData, rtu): ListResponseData => {
        if (acc[rtu.user.username] === undefined) {
          acc[rtu.user.username] = [];
        }

        acc[rtu.user.username].push({
          rankId: rtu.rank.id,
          rankTitle: rtu.rank.title,
          comment: rtu.comment,
          count: rtu.count,
        });

        return acc;
      }, {});

    const response = new ListResponse(usersRanks);

    return response;
  }
}
