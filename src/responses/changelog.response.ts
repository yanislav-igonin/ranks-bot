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
        this.text = this.text.concat('Добавлено:\n');

        for (const addedElem of changesForDate.added) {
          this.text = this.text.concat(`${addedElem.currentValue}\n`);
        }

        this.text = this.text.concat('\n');
      }

      if (changesForDate.updated) {
        this.text = this.text.concat('Изменено:\n');

        for (const updatedElem of changesForDate.updated) {
          this.text = this.text
            .concat(`${updatedElem.previousValue} -> ${updatedElem.currentValue}\n`);
        }

        this.text = this.text.concat('\n');
      }

      if (changesForDate.deleted) {
        this.text = this.text.concat('Удалено:\n');

        for (const deletedElem of changesForDate.deleted) {
          this.text = this.text.concat(`${deletedElem.previousValue}\n`);
        }

        this.text = this.text.concat('\n');
      }

      if (changesForDate.assigned) {
        this.text = this.text.concat('Присвоено:\n');

        for (const assignedElem of changesForDate.assigned) {
          this.text = this.text.concat(`${assignedElem.currentValue}\n`);
        }

        this.text = this.text.concat('\n');
      }

      if (changesForDate.unassigned) {
        this.text = this.text.concat('Аннулировано:\n');

        for (const unassignedElem of changesForDate.unassigned) {
          if (unassignedElem.currentValue === '') {
            this.text = this.text.concat(`${unassignedElem.previousValue}\n`);
          } else {
            this.text = this.text
              .concat(`${unassignedElem.previousValue} -> ${unassignedElem.currentValue}\n`);
          }
        }

        this.text = this.text.concat('\n');
      }

      this.text = this.text.concat('\n\n');
    }
  }
}
