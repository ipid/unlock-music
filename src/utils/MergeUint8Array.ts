export function MergeUint8Array(array: Uint8Array[]): Uint8Array {
  let length = 0;
  array.forEach((item) => {
    length += item.length;
  });

  let mergedArray = new Uint8Array(length);
  let offset = 0;
  array.forEach((item) => {
    mergedArray.set(item, offset);
    offset += item.length;
  });

  return mergedArray;
}
