import { Injectable } from '@nestjs/common';

@Injectable()
export class InflightRequestsService {
  private readonly inflight = new Map<string, Promise<any>>();

  get<T>(key: string): Promise<T> | undefined {
    return this.inflight.get(key) as Promise<T> | undefined;
  }

  set<T>(key: string, p: Promise<T>) {
    this.inflight.set(key, p);
    p.finally(() => this.inflight.delete(key));
  }
}

