import BaseStorage from './BaseStorage';

declare var chrome: any;

export default class ChromeExtensionStorage extends BaseStorage {
  static get works(): boolean {
    return typeof chrome !== 'undefined' && Boolean(chrome?.storage?.local?.set);
  }

  protected async load<T>(name: string, defaultValue: T): Promise<T> {
    const result = await chrome.storage.local.get({ [name]: defaultValue });
    if (Object.prototype.hasOwnProperty.call(result, name)) {
      return result[name];
    }
    return defaultValue;
  }

  protected async save<T>(name: string, value: T): Promise<void> {
    return chrome.storage.local.set({ [name]: value });
  }
}
