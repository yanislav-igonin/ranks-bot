interface AddResponseData {
  rankId: number;
  rankTitle: string;
}

export class AddResponse {
  text: string;

  constructor(data: AddResponseData) {
    const { rankId, rankTitle } = data;
    this.text = `Добавлено звание: ${rankTitle}, ID - ${rankId}`;
  }
}
