interface ChangelogChunk {
  createdAt: string;
  type: string;
  table: string;
  previousValue: string;
  currentValue: string;
}

interface ChangelogResponseData {
  changelog: ChangelogChunk[];
}

export class ChangelogResponse {
  public text: string;

  public constructor(data: ChangelogResponseData) {
    const { changelog } = data;

    this.text = 'Лог изменений\n';
  }
}
