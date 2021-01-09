import { UpdateResponse } from '../responses';
import { RankDao, ChangelogDao } from '../modules/db/dao';

interface UpdateServiceData {
  user: { id: number };
  rank: { id: number; nextTitle: string };
  dao: { rank: RankDao; changelog: ChangelogDao };
}

export class UpdateService {
  private dao: { rank: RankDao; changelog: ChangelogDao };

  private rank: { id: number; nextTitle: string };

  private user: { id: number };

  constructor(data: UpdateServiceData) {
    this.rank = data.rank;
    this.dao = data.dao;
    this.user = data.user;
  }

  async handle() {
    if (Number.isNaN(this.rank.id) === true) {
      return { text: 'Нет такого звания, пошел нахуй, долбаеб' };
    }

    if (this.rank.nextTitle === '') {
      return { text: 'Звание-то введи, болван' };
    }

    const rank = await this.dao.rank.getRank({ id: this.rank.id });

    if (rank === null) {
      return { text: 'Нет такого звания, пошел нахуй, долбаеб' };
    }

    await this.dao.rank.updateRank({ id: rank.id, title: this.rank.nextTitle });

    await this.dao.changelog.createChangelog({
      userId: this.user.id,
      type: 'update',
      table: 'ranks',
      objectId: rank.id,
      previousValue: rank.title,
      currentValue: this.rank.nextTitle,
    });

    const response = new UpdateResponse({
      rankId: rank.id,
      rankPreviousTitle: rank.title,
      rankCurrentTitle: this.rank.nextTitle,
    });

    return response;
  }
}
