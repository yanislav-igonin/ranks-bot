import { AssignResponse } from '../responses';
import { RankDao, ChangelogDao, RankToUserDao } from '../modules/db/dao';

interface AssignServiceData {
  user: { id: number };
  rank: { id: number; comment: string; userId: number };
  dao: { rank: RankDao; changelog: ChangelogDao; rankToUser: RankToUserDao };
}

export class AssignService {
  private dao: { rank: RankDao; changelog: ChangelogDao; rankToUser: RankToUserDao };

  private rank: { id: number; comment: string; userId: number };

  private user: { id: number };

  public constructor(data: AssignServiceData) {
    this.rank = data.rank;
    this.dao = data.dao;
    this.user = data.user;
  }

  public async handle(): Promise<AssignResponse> {
    // /assign {rankId} {username} {comment}
    // if (Number.isNaN(this.rank.id) === true) {
    //   return { text: 'Нет такого звания, пошел нахуй, долбаеб' };
    // }

    // if (this.rank.nextTitle === '') {
    //   return { text: 'Звание-то введи, болван' };
    // }

    // const rank = await this.dao.rank.getRank({ id: this.rank.id });

    // if (rank === null) {
    //   return { text: 'Нет такого звания, пошел нахуй, долбаеб' };
    // }

    // await this.dao.rank.updateRank({ id: rank.id, title: this.rank.nextTitle });

    // await this.dao.changelog.createChangelog({
    //   userId: this.user.id,
    //   type: 'insert',
    //   table: 'ranks_to_users',
    //   objectId: rankToUser.id,
    // previousValue: rank.title,
    // currentValue: this.rank.nextTitle,
    // });

    const response = new AssignResponse({
      rankId: 0,
      rankTitle: 'rank.title',
      username: `${this.rank.userId}`,
    });

    return response;
  }
}
