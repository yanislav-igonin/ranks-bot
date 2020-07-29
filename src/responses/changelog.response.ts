export interface ChangelogChunk {
  previousValue: string;
  currentValue: string;
}

export interface ChangelogResponseData {
  [K: string]: {
    added?: ChangelogChunk[];
    deleted?: ChangelogChunk[];
    updated?: ChangelogChunk[];
    assigned?: ChangelogChunk[];
    unassigned?: ChangelogChunk[];
  };
}

export class ChangelogResponse {
  public text: string;

  public constructor(data: ChangelogResponseData) {
    this.text = 'Лог изменений\n\n';

    const dates = Object.keys(data);

    for (const date of dates) {
      this.text = this.text.concat(`${date}\n`);

      const changesForDate = data[date];

      if (changesForDate.added) {
        this.text = this.text.concat('Добавлено\n');

        for (const addedElem of changesForDate.added) {
          this.text = this.text.concat(`${addedElem.currentValue}\n`);
        }
      }

      if (changesForDate.deleted) {
        this.text = this.text.concat('Удалено\n');

        for (const deletedElem of changesForDate.deleted) {
          this.text = this.text.concat(`${deletedElem.previousValue}\n`);
        }
      }


      this.text = this.text.concat('\n');
    }
  }
}

/*
29.07.2020
Добавлено:
Удалено
Изменено:
Присвоено:
Аннулировано:
*/
