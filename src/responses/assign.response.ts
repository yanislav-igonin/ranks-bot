interface AssignResponseData {
  username: string;
  rankId: number;
  rankTitle: string;
}

export class AssignResponse {
  public text: string;

  public constructor(data: AssignResponseData) {
    const { rankId, rankTitle, username } = data;
    this.text = `Присвоено звание @${username}: ${rankTitle}, ID - ${rankId}`;
  }
}
