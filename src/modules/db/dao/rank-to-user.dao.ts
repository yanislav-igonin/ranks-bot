import { Repository } from 'typeorm';
import { DbModule } from '../db.module';
import { RankToUserEntity } from '../entities';

export class RankDao {
  private repository: Repository<RankToUserEntity>;

  public constructor() {
    this.repository = DbModule.getRepository(RankToUserEntity);
  }

  public async getRanksToUsers(): Promise<RankToUserEntity[]> {
    const ranks = await this.repository.find({
      relations: ['users', 'ranks'],
    });
    return ranks;
  }
}
