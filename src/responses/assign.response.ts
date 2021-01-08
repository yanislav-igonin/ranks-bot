interface AssignResponseData {
  username: string;
  rankId: number;
  rankTitle: string;
  rankCount?: number;
}

export class AssignResponse {
  text: string;

  constructor(data: AssignResponseData) {
    const {
      rankId, rankTitle, username, rankCount,
    } = data;

    if (rankCount) {
      this.text = `Повторно присвоено звание @${username}: ${rankTitle}, счетчик - ${rankCount}, ID - ${rankId}`;
    } else {
      this.text = `Присвоено звание @${username}: ${rankTitle}, ID - ${rankId}`;
    }
  }
}
