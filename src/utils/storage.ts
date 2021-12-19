import BaseStorage from './storage/BaseStorage';
import BrowserNativeStorage from './storage/BrowserNativeStorage';
import ChromeExtensionStorage from './storage/ChromeExtensionStorage';

const storage: BaseStorage = ChromeExtensionStorage.works ? new ChromeExtensionStorage() : new BrowserNativeStorage();

export default storage;
