export const KEY_PREFIX = 'um.conf.';
const KEY_JOOX_UUID = `${KEY_PREFIX}joox.uuid`;

export default abstract class BaseStorage {
  protected abstract save<T>(name: string, value: T): Promise<void>;
  protected abstract load<T>(name: string, defaultValue: T): Promise<T>;
  public abstract getAll(): Promise<Record<string, any>>;
  public abstract setAll(obj: Record<string, any>): Promise<void>;

  public saveJooxUUID(uuid: string): Promise<void> {
    return this.save(KEY_JOOX_UUID, uuid);
  }

  public loadJooxUUID(defaultValue: string = ''): Promise<string> {
    return this.load(KEY_JOOX_UUID, defaultValue);
  }
}
