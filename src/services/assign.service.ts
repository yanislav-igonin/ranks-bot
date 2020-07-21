import { AssignResponse } from '../responses';
import {
  RankDao, ChangelogDao, RankToUserDao, UserDao,
} from '../modules/db/dao';

interface AssignServiceData {
  user: { id: number };
  rank: { id: number; comment: string; username: string };
  dao: {
    rank: RankDao;
    changelog: ChangelogDao;
    rankToUser: RankToUserDao;
    user: UserDao;
  };
}

export class AssignService {
  private dao: {
    rank: RankDao;
    changelog: ChangelogDao;
    rankToUser: RankToUserDao;
    user: UserDao;
  };

  private rank: { id: number; comment: string; username: string };

  private user: { id: number };

  public constructor(data: AssignServiceData) {
    this.rank = data.rank;
    this.dao = data.dao;
    this.user = data.user;
  }

  public async handle(): Promise<AssignResponse> {
    if (Number.isNaN(this.rank.id) === true) {
      return { text: 'Нет такого звания, пошел нахуй, долбаеб' };
    }

    if (this.rank.username === '') {
      return { text: 'Нет такого пользователя, болван' };
    }

    const userToAssign = await this.dao.user.getUserByUsername({
      username: this.rank.username,
    });

    if (userToAssign === null) {
      return { text: 'Нет такого пользователя, болван' };
    }

    const rankToAssign = await this.dao.rank.getRank({ id: this.rank.id });

    if (rankToAssign === null) {
      return { text: 'Нет такого звания, пошел нахуй, долбаеб' };
    }

    const assignedRank = await this.dao.rankToUser.getRankToUser({
      rankId: rankToAssign.id,
      userId: userToAssign.id,
    });

    if (assignedRank !== null) {
      await this.dao
        .rankToUser.increaseRankCounter({
          userId: userToAssign.id,
          rankId: rankToAssign.id,
        });

      await this.dao.changelog.createChangelog({
        userId: this.user.id,
        type: 'update',
        table: 'ranks_to_users',
        objectId: assignedRank.id,
        previousValue: `${rankToAssign.title} x${assignedRank.count}`,
        currentValue: `${rankToAssign.title} x${assignedRank.count + 1}`,
      });

      const response = new AssignResponse({
        rankId: rankToAssign.id,
        rankTitle: rankToAssign.title,
        username: userToAssign.username,
      });

      return response;
    }

    const newAssignedRank = await this.dao.rankToUser.assignRankToUser({
      userId: userToAssign.id,
      rankId: rankToAssign.id,
      comment: this.rank.comment,
    });

    await this.dao.changelog.createChangelog({
      userId: this.user.id,
      type: 'insert',
      table: 'ranks_to_users',
      objectId: newAssignedRank.id,
      currentValue: rankToAssign.title,
    });

    const response = new AssignResponse({
      rankId: rankToAssign.id,
      rankTitle: rankToAssign.title,
      username: userToAssign.username,
    });

    return response;
  }
}
