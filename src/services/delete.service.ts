import { DeleteResponse } from '../responses';
import { RankDao, ChangelogDao } from '../modules/db/dao';

interface DeleteServiceData {
  user: { id: number };
  rank: { id: number };
  dao: { rank: RankDao; changelog: ChangelogDao };
}

export class DeleteService {
  private dao: { rank: RankDao; changelog: ChangelogDao };

  private rank: { id: number };

  private user: { id: number };

  public constructor(data: DeleteServiceData) {
    this.rank = data.rank;
    this.dao = data.dao;
    this.user = data.user;
  }

  public async handle(): Promise<DeleteResponse> {
    const rank = await this.dao.rank.getRank({ id: this.rank.id });

    if (rank === null) {
      return { text: 'Нет такого звания, пошел нахуй, долбаеб' };
    }

    await this.dao.rank.deleteRank({ id: rank.id });

    await this.dao.changelog.createChangelog({
      userId: this.user.id,
      type: 'delete',
      table: 'ranks',
      objectId: rank.id,
    });

    const response = new DeleteResponse({ rankId: rank.id, rankTitle: rank.title });

    return response;
  }
}
