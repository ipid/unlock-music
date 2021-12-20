import BaseStorage from './BaseStorage';

export default class BrowserNativeStorage extends BaseStorage {
  public static get works() {
    return typeof localStorage !== 'undefined' && localStorage.getItem;
  }

  protected async load<T>(name: string, defaultValue: T): Promise<T> {
    const result = localStorage.getItem(name);
    if (result === null) {
      return defaultValue;
    }
    return JSON.parse(result);
  }

  protected async save<T>(name: string, value: T): Promise<void> {
    localStorage.setItem(name, JSON.stringify(value));
  }

  public async getAll(): Promise<Record<string, any>> {
    const result = {};
    for (const [key, value] of Object.entries(localStorage)) {
      Object.assign(result, { [key]: JSON.parse(value) });
    }
    return result;
  }

  public async setAll(obj: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(obj)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
}
