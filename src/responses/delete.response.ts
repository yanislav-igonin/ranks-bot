interface DeleteResponseData {
  rankId: number;
  rankTitle: string;
}

export class DeleteResponse {
  public text: string;

  public constructor(data: DeleteResponseData) {
    const { rankId, rankTitle } = data;
    this.text = `Удалено звание: ${rankTitle}, ID - ${rankId}`;
  }
}
