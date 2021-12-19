import BaseStorage from './BaseStorage';

export default class BrowserNativeStorage extends BaseStorage {
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
}
