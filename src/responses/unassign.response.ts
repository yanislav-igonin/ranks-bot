interface UnassignResponseData {
  username: string;
  rankId: number;
  rankTitle: string;
}

export class UnassignResponse {
  public text: string;

  public constructor(data: UnassignResponseData) {
    const { rankId, rankTitle, username } = data;
    this.text = `Аннулировано звание @${username}: ${rankTitle}, ID - ${rankId}`;
  }
}
