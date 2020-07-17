interface HelpResponseData {
  text: string;
}

export class HelpResponse {
  public text: string;

  public constructor(data: HelpResponseData) {
    this.text = data.text;
  }
}
