import { AddResponse } from '../responses';
import { RankDao } from '../modules/db/dao';

interface AddServiceData {
  rank: { title: string };
  dao: { rank: RankDao };
}

export class AddService {
  private dao: { rank: RankDao };

  private rank: { title: string };

  public constructor(data: AddServiceData) {
    this.rank = data.rank;
    this.dao = data.dao;
  }

  public async handle(): Promise<AddResponse> {
    const rank = await this.dao.rank.createRank({ title: this.rank.title });
    const response = new AddResponse({ rankId: rank.id, rankTitle: rank.title });

    return response;
  }
}
