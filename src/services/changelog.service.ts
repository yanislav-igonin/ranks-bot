import { ChangelogResponse } from '../responses';
import { ChangelogResponseData } from '../responses/changelog.response';
import { ChangelogDao } from '../modules/db/dao';
import { ChangelogEntity } from '../modules/db/entities';

type OperationField = 'added' | 'updated' | 'deleted' | 'assigned' | 'unassigned';

function getLogOperationField(
  { table, type }: Pick<ChangelogEntity, 'table' | 'type'>,
): OperationField {
  const tablesOperationsMap = {
    ranks_to_users: {
      insert: 'assigned',
      update: 'unassigned', // вот эта вот шляпа не позволяет конкретно указывать, что я сделал, присвоил еще раз или аннулировал
      delete: 'unassigned',
    },
    ranks: {
      insert: 'added',
      update: 'updated',
      delete: 'deleted',
    },
  };

  const tableOperations = tablesOperationsMap[
    table as 'ranks_to_users' | 'ranks'
  ];
  const operationField = tableOperations[
    type as 'update' | 'delete' | 'insert'
  ];

  return operationField as OperationField;
}

interface ChangelogServiceData {
  dao: { changelog: ChangelogDao };
}

export class ChangelogService {
  private dao: { changelog: ChangelogDao };

  constructor(data: ChangelogServiceData) {
    this.dao = data.dao;
  }

  async handle() {
    const rawChangelog = await this.dao.changelog.getChangelogs(); // TODO: вывод ника вместе с изменениями

    const changelog = rawChangelog.reduce<ChangelogResponseData>((acc, record) => {
      const {
        createdAt, currentValue, previousValue, table, type,
      } = record;

      const day = createdAt.getDate();
      const month = createdAt.getMonth() + 1;
      const year = createdAt.getFullYear();
      const date = `${day < 10 ? `0${day}` : day}.${month < 10 ? `0${month}` : month}.${year}`;

      if (acc[date] === undefined) {
        acc[date] = {};
      }

      const logOperationField = getLogOperationField({ table, type });

      if (acc[date][logOperationField] === undefined) {
        acc[date][logOperationField] = [];
      }

      acc[date][logOperationField]?.push({ previousValue, currentValue });

      return acc;
    }, {});

    const response = new ChangelogResponse(changelog);

    return response;
  }
}
