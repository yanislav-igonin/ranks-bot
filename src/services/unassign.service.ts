import { UnassignResponse } from '../responses';
import {
  RankDao, ChangelogDao, RankToUserDao, UserDao,
} from '../modules/db/dao';

interface UnassignServiceData {
  user: { id: number };
  rank: { id: number; username: string };
  dao: {
    rank: RankDao;
    changelog: ChangelogDao;
    rankToUser: RankToUserDao;
    user: UserDao;
  };
}

export class UnassignService {
  private dao: {
    rank: RankDao;
    changelog: ChangelogDao;
    rankToUser: RankToUserDao;
    user: UserDao;
  };

  private rank: { id: number; username: string };

  private user: { id: number };

  constructor(data: UnassignServiceData) {
    this.rank = data.rank;
    this.dao = data.dao;
    this.user = data.user;
  }

  async handle() {
    if (Number.isNaN(this.rank.id) === true) {
      return { text: 'Нет такого звания, пошел нахуй, долбаеб' };
    }

    if (this.rank.username === '') {
      return { text: 'Нет такого пользователя, болван' };
    }

    const userToUnassign = await this.dao.user.getUserByUsername({
      username: this.rank.username,
    });

    if (userToUnassign === null) {
      return { text: 'Нет такого пользователя, болван' };
    }

    const rankToUnassign = await this.dao.rank.getRank({ id: this.rank.id });

    if (rankToUnassign === null) {
      return { text: 'Нет такого звания, пошел нахуй, долбаеб' };
    }

    const assignedRank = await this.dao.rankToUser.getRankToUser({
      rankId: rankToUnassign.id,
      userId: userToUnassign.id,
    });

    if (assignedRank === null) {
      return { text: 'Этому игроку это звание не присвоено, дебил' };
    }

    if (assignedRank.count > 1) {
      await this.dao
        .rankToUser.decreaseRankCounter({
          userId: userToUnassign.id,
          rankId: rankToUnassign.id,
        });

      await this.dao.changelog.createChangelog({
        userId: this.user.id,
        type: 'update',
        table: 'ranks_to_users',
        objectId: assignedRank.id,
        previousValue: `${rankToUnassign.title} x${assignedRank.count}`,
        currentValue: `${rankToUnassign.title} x${assignedRank.count - 1}`,
      });

      return new UnassignResponse({
        rankId: assignedRank.id,
        rankTitle: rankToUnassign.title,
        username: userToUnassign.username,
        rankCount: assignedRank.count - 1,
      });
    }

    await this.dao.rankToUser.unassignRankToUser({
      userId: userToUnassign.id,
      rankId: rankToUnassign.id,
    });

    await this.dao.changelog.createChangelog({
      userId: this.user.id,
      type: 'delete',
      table: 'ranks_to_users',
      objectId: assignedRank.id,
      previousValue: `${rankToUnassign.title}`,
    });

    const response = new UnassignResponse({
      rankId: rankToUnassign.id,
      rankTitle: rankToUnassign.title,
      username: userToUnassign.username,
    });

    return response;
  }
}
