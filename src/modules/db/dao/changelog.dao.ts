import { Repository } from 'typeorm';
import { DbModule } from '../db.module';
import { ChangelogEntity } from '../entities';

interface CreateChangelogData {
  userId: number;
  table: 'ranks' | 'ranks_to_users';
  type: 'update' | 'insert' | 'delete';
  objectId: number;
  previousValue?: string;
  currentValue?: string;
}

export class ChangelogDao {
  private repository: Repository<ChangelogEntity>;

  public constructor() {
    this.repository = DbModule.getRepository(ChangelogEntity);
  }

  public async createChangelog(
    data: CreateChangelogData,
  ): Promise<void> {
    const {
      type, userId, table, objectId, previousValue, currentValue,
    } = data;

    await this.repository.save({
      type,
      table,
      objectId,
      user: { id: userId },
      previousValue,
      currentValue,
    });
  }

  public async getChangelogs(): Promise<ChangelogEntity[]> {
    const changelogs = await this.repository.find();

    return changelogs;
  }
}
