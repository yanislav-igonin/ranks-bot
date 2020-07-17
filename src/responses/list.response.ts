interface ListResponseData {
  text: string;
}

export class ListResponse {
  public text: string;

  public constructor(data: ListResponseData) {
    this.text = data.text;
  }
}
