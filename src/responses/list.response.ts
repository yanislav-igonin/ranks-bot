export interface ListResponseRankData {
  rankId: number;
  rankTitle: string;
  comment: string;
  count: number;
}

export interface ListResponseData {
  [K: string]: ListResponseRankData[];
}

export class ListResponse {
  public text: string;

  public constructor(data: ListResponseData) {
    this.text = '';
    const keys = Object.keys(data);

    for (const key of keys) {
      this.text = this.text.concat(`@${key}\n`);
      const userRanks = data[key];

      for (const rank of userRanks) {
        const {
          rankId, rankTitle, count, comment,
        } = rank;

        this.text = this
          .text
          .concat(
            `${rankId}. ${rankTitle}${count > 1 ? ` x${count}` : ''}${comment !== '' ? ` - ${comment}` : ''}\n`,
          );
      }

      this.text = this.text.concat('\n');
    }

    this.text = this.text.replace('@toPlay', 'Розыгрыш:');
  }
}
