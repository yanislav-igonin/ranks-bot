import { report } from 'process';
import { HelpResponse } from '../responses';

export class HelpService {
  private data: { text: string};

  public constructor(data: { text: string}) {
    this.data = data;
  }

  public handle(): HelpResponse {
    const response = new HelpResponse(this.data);
    return response;
  }
}
