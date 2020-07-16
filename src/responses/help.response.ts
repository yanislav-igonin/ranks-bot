export class HelpResponse {
  public text: string;

  public constructor(data: { text: string}) {
    this.text = data.text;
  }
}
