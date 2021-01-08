interface DeleteResponseData {
  rankId: number;
  rankTitle: string;
}

export class DeleteResponse {
  text: string;

  constructor(data: DeleteResponseData) {
    const { rankId, rankTitle } = data;
    this.text = `Удалено звание: ${rankTitle}, ID - ${rankId}`;
  }
}
