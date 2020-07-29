import { ChangelogResponse } from '../responses';
import { ChangelogResponseData } from '../responses/changelog.response';
import { ChangelogDao } from '../modules/db/dao';

interface DeleteServiceData {
  dao: { changelog: ChangelogDao };
}

export class ChangelogService {
  private dao: { changelog: ChangelogDao };

  public constructor(data: DeleteServiceData) {
    this.dao = data.dao;
  }

  public async handle(): Promise<ChangelogResponse> {
    const rawChangelog = await this.dao.changelog.getChangelogs();

    const changelog = rawChangelog.reduce<ChangelogResponseData>(
      (acc, record): ChangelogResponseData => {
        const {
          createdAt, currentValue, previousValue, table, type,
        } = record;
        console.log('DEBUG: ChangelogService -> record', record);

        const day = createdAt.getDate() + 1;
        const month = createdAt.getMonth() + 1;
        const year = createdAt.getFullYear();
        const date = `${day < 10 ? `0${day}` : day}.${month < 10 ? `0${month}` : month}.${year}`;
        console.log('DEBUG: ChangelogService -> date', date);

        if (acc[date] === undefined) {
          acc[date] = {};
        }

        return acc;
      }, {},
    );

    console.log('DEBUG: ChangelogService -> changelog', changelog);

    const response = new ChangelogResponse(changelog);

    return response;
  }
}
