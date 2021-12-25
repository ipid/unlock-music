import BaseStorage, { KEY_PREFIX } from './BaseStorage';

declare var chrome: any;

export default class ChromeExtensionStorage extends BaseStorage {
  static get works(): boolean {
    return typeof chrome !== 'undefined' && Boolean(chrome?.storage?.local?.set);
  }

  protected async load<T>(name: string, defaultValue: T): Promise<T> {
    return new Promise((resolve) => {
      chrome.storage.local.get({ [name]: defaultValue }, (result: any) => {
        if (Object.prototype.hasOwnProperty.call(result, name)) {
          resolve(result[name]);
        } else {
          resolve(defaultValue);
        }
      });
    });
  }

  protected async save<T>(name: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [name]: value }, resolve);
    });
  }

  public async getAll(): Promise<Record<string, any>> {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (obj: Record<string, any>) => {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (key.startsWith(KEY_PREFIX)) {
            result[key] = value;
          }
        }
        resolve(result);
      });
    });
  }

  public async setAll(obj: Record<string, any>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(obj, resolve);
    });
  }
}
