import { HelpResponse } from '../responses';

export class HelpService {
  private data: { text: string};

  constructor(data: { text: string }) {
    this.data = data;
  }

  handle(): HelpResponse {
    const response = new HelpResponse(this.data);
    return response;
  }
}
