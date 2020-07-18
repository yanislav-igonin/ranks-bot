import { AddResponse } from '../responses';
import { RankDao, ChangelogDao } from '../modules/db/dao';

interface AddServiceData {
  user: { id: number };
  rank: { title: string };
  dao: { rank: RankDao; changelog: ChangelogDao };
}

export class AddService {
  private dao: { rank: RankDao; changelog: ChangelogDao };

  private rank: { title: string };

  private user: { id: number };

  public constructor(data: AddServiceData) {
    this.rank = data.rank;
    this.dao = data.dao;
    this.user = data.user;
  }

  public async handle(): Promise<AddResponse> {
    const rank = await this.dao.rank.createRank({ title: this.rank.title });

    await this.dao.changelog.createChangelog({
      userId: this.user.id,
      type: 'insert',
      table: 'ranks',
      objectId: rank.id,
    });

    const response = new AddResponse({ rankId: rank.id, rankTitle: rank.title });

    return response;
  }
}
