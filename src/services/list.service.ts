import { ListResponse } from '../responses';
import { ListResponseData, ListResponseRankData } from '../responses/list.response';
import { RankToUserDao, RankDao } from '../modules/db/dao';

interface ListServiceData {
  dao: { rankToUser: RankToUserDao; rank: RankDao };
}

export class ListService {
  private dao: { rankToUser: RankToUserDao; rank: RankDao };

  constructor(data: ListServiceData) {
    this.dao = data.dao;
  }

  async handle() {
    const ranksToUsers = await this.dao.rankToUser.getRanksToUsers();
    const assignedRanksIds = ranksToUsers.map((rtu): number => rtu.rank.id);
    const allRanks = await this.dao.rank.getRanks();
    const unassignedRanks = allRanks
      .filter((rank): boolean => !assignedRanksIds.includes(rank.id));

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

    usersRanks.toPlay = unassignedRanks.map((rank): ListResponseRankData => ({
      rankId: rank.id,
      rankTitle: rank.title,
      comment: '',
      count: 0,
    }));

    const response = new ListResponse(usersRanks);

    return response;
  }
}
