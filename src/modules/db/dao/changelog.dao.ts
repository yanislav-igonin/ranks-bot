import { Repository } from 'typeorm';
import { DbModule } from '../db.module';
import { ChangelogEntity } from '../entities';

type UpdateType = 'update' | 'insert' | 'delete';
type TableName = 'ranks' | 'ranks_to_users';
interface CreateChangelogData {
  userId: number;
  table: TableName;
  type: UpdateType;
  objectId: number;
  previousValue?: string;
  currentValue?: string;
}

/**
 * неправильный тип апдейта при присвоении звания в ченджлоге
 * звание попадает в графу аннулировано
 */

export class ChangelogDao {
  private repository: Repository<ChangelogEntity>;

  constructor() {
    this.repository = DbModule.getRepository(ChangelogEntity);
  }

  async createChangelog(data: CreateChangelogData): Promise<void> {
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

  async getChangelogs(): Promise<ChangelogEntity[]> {
    const changelogs = await this.repository.find({
      relations: ['user'],
    });

    return changelogs;
  }
}
