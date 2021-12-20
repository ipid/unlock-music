import BaseStorage from './BaseStorage';

export default class InMemoryStorage extends BaseStorage {
  private values = new Map<string, any>();
  protected async load<T>(name: string, defaultValue: T): Promise<T> {
    if (this.values.has(name)) {
      return this.values.get(name);
    }

    return defaultValue;
  }

  protected async save<T>(name: string, value: T): Promise<void> {
    this.values.set(name, value);
  }

  public async getAll(): Promise<Record<string, any>> {
    const result = {};
    this.values.forEach((value, key) => {
      Object.assign(result, {
        [key]: value,
      });
    });
    return result;
  }

  public async setAll(obj: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(obj)) {
      this.values.set(key, value);
    }
  }
}
