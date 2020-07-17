interface AddResponseData {
  rankId: number;
  rankTitle: string;
}

export class AddResponse {
  public text: string;

  public constructor(data: AddResponseData) {
    const { rankId, rankTitle } = data;
    this.text = `Добавлено звание: ${rankTitle}, ID - ${rankId}`;
  }
}
