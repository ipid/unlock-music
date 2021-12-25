import BaseStorage from './BaseStorage';
import BrowserNativeStorage from './BrowserNativeStorage';
import ChromeExtensionStorage from './ChromeExtensionStorage';
import InMemoryStorage from './InMemoryStorage';

export default function storageFactory(): BaseStorage {
  if (ChromeExtensionStorage.works) {
    return new ChromeExtensionStorage();
  } else if (BrowserNativeStorage.works) {
    return new BrowserNativeStorage();
  }
  return new InMemoryStorage();
}
