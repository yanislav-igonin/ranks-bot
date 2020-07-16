import { Repository } from 'typeorm';
import { DbModule } from '../db.module';
import { RankEntity } from '../entities';

export class RankDao {
  private repository: Repository<RankEntity>;

  public constructor() {
    this.repository = DbModule.getRepository(RankEntity);
  }

  public async getRanks(): Promise<RankEntity[]> {
    const ranks = await this.repository.find();
    return ranks;
  }
}
