interface HelpResponseData {
  text: string;
}

export class HelpResponse {
  text: string;

  constructor(data: HelpResponseData) {
    this.text = data.text;
  }
}
