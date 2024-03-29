interface UpdateResponseData {
  rankId: number;
  rankPreviousTitle: string;
  rankCurrentTitle: string;
}

export class UpdateResponse {
  text: string;

  constructor(data: UpdateResponseData) {
    const { rankId, rankPreviousTitle, rankCurrentTitle } = data;
    this.text = `Обновлено звание: ${rankPreviousTitle} -> ${rankCurrentTitle}, ID - ${rankId}`;
  }
}
