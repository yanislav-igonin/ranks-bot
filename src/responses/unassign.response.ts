interface UnassignResponseData {
  username: string;
  rankId: number;
  rankTitle: string;
  rankCount?: number;
}

export class UnassignResponse {
  text: string;

  constructor(data: UnassignResponseData) {
    const {
      rankId, rankTitle, username, rankCount,
    } = data;

    if (rankCount) {
      this.text = `Повторно аннулировано звание @${username}: ${rankTitle}, счетчик - ${rankCount}, ID - ${rankId}`;
    } else {
      this.text = `Аннулировано звание @${username}: ${rankTitle}, ID - ${rankId}`;
    }
  }
}
