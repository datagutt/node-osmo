export { ByteBuf };
export type { IntResult, StringResult };

// DataView prototype adapted from https://gist.github.com/tjmehta/7e0f0d2aca966c71e70a453d0786f938

const littleEndian24 = [0, 1, 2];
const bigEndian24 = [2, 1, 0];

function boundsCheck(offset: number, size: number, max: number): boolean {
  if (offset < 0x0) {
    console.error('Tried to write to a negative offset');

    return false;
  } else if (offset + size > max) {
    console.error(
      `Tried to write ${size} bytes past the end of a buffer at offset 0x${offset.toString(16)} of 0x${max.toString(16)}`,
    );

    return false;
  }

  return true;
}

/**
 * A byte buffer.
 *
 * Supports the following data types:
 * - Bool
 * - Int (8, 16, 32, 64)
 * - Uint (8, 16, 32, 64)
 * - BigInt (64)
 * - VarInt (unsigned, signed, and zigzag)
 * - String (utf8, utf16, and delimited)
 * - TypedArray
 *
 * @extends DataView
 */
class ByteBuf extends DataView {
  /**
   * Creates a byte buffer.
   * @param source The data source.
   * @param byteOffset The byte offset.
   * @param byteLength The byte length.
   * @returns A byte buffer.
   */
  static from(
    source: BufferSource,
    byteOffset?: number,
    byteLength?: number,
  ): ByteBuf {
    const buffer = source instanceof ArrayBuffer ? source : source.buffer;

    if (ArrayBuffer.isView(source)) {
      byteOffset = source.byteOffset + (byteOffset || 0);
    }

    return byteLength === undefined
      ? new ByteBuf(buffer, byteOffset)
      : new ByteBuf(
          buffer,
          byteOffset,
          Math.min(source.byteLength, byteLength),
        );
  }

  /**
   * The byte offset.
   */
  #byteOffset: number = super.byteOffset;

  /**
   * The byte offset.
   * @returns The byte offset.
   */
  get byteOffset(): number {
    return this.#byteOffset;
  }

  /**
   * The number of remaining bytes.
   * @returns The number of bytes remaining.
   */
  get bytesRemaining(): number {
    return this.byteLength - this.#byteOffset;
  }

  /**
   * Skips the byte offset.
   * @param byteLength The byte length.
   */
  skip(byteLength: number): void {
    this.#byteOffset += byteLength;
  }

  /**
   * Resets the byte offset.
   */
  reset(): void {
    this.#byteOffset = super.byteOffset;
  }

  /**
   * Clears the byte buffer.
   */
  clear(): void {
    this.getUint8Array(0).fill(0);
  }

  /**
   * Gets a boolean.
   * @param byteOffset The byte offset.
   */
  getBool(byteOffset: number): boolean {
    return this.getInt8(byteOffset) !== 0;
  }

  /**
   * Reads the next boolean.
   */
  readBool(): boolean {
    return this.getInt8(this.#byteOffset++) !== 0;
  }

  /**
   * Sets a boolean.
   * @param byteOffset The byte offset.
   * @param value The value.
   */
  setBool(byteOffset: number, value: boolean): void {
    super.setInt8(byteOffset, value ? 1 : 0);
  }

  /**
   * Writes the next boolean.
   * @param value The value.
   */
  writeBool(value: boolean): void {
    this.setInt8(this.#byteOffset++, value ? 1 : 0);
  }

  /**
   * Gets an signed byte.
   * @param byteOffset The byte offset.
   * @returns The value.
   */
  getInt8(byteOffset: number): number {
    return super.getInt8(byteOffset);
  }

  /**
   * Reads the next signed byte.
   * @returns The value.
   */
  readInt8(): number {
    return this.getInt8(this.#byteOffset++);
  }

  /**
   * Sets a signed byte.
   * @param byteOffset The byte offset.
   * @param value The value.
   */
  setInt8(byteOffset: number, value: number): void {
    super.setInt8(byteOffset, value);
  }

  /**
   * Writes the next signed byte.
   * @param value The value.
   */
  writeInt8(value: number): void {
    this.setInt8(this.#byteOffset++, value);
  }

  /**
   * Gets an unsigned byte.
   * @param byteOffset The byte offset.
   * @returns The value.
   */
  getUint8(byteOffset: number): number {
    return super.getUint8(byteOffset);
  }

  /**
   * Reads the next unsigned byte.
   * @returns The value.
   */
  readUint8(): number {
    return this.getUint8(this.#byteOffset++);
  }

  /**
   * Sets an unsigned byte.
   * @param byteOffset The byte offset.
   * @param value The value.
   */
  setUint8(byteOffset: number, value: number): void {
    super.setUint8(byteOffset, value);
  }

  /**
   * Writes the next signed byte.
   * @param value The value.
   */
  writeUint8(value: number): void {
    this.setUint8(this.#byteOffset++, value);
  }

  /**
   * Gets an signed short.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getInt16(byteOffset: number, littleEndian?: boolean): number {
    return super.getInt16(byteOffset, littleEndian);
  }

  /**
   * Reads the next signed short.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readInt16(littleEndian?: boolean): number {
    const value = this.getInt16(this.#byteOffset, littleEndian);
    this.#byteOffset += 2;
    return value;
  }

  /**
   * Sets a signed short.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setInt16(byteOffset: number, value: number, littleEndian?: boolean): void {
    super.setInt16(byteOffset, value, littleEndian);
  }

  /**
   * Writes the next signed short.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeInt16(value: number, littleEndian?: boolean): void {
    this.setInt16(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 2;
  }

  /**
   * Gets an unsigned short.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getUint16(byteOffset: number, littleEndian?: boolean): number {
    return super.getUint16(byteOffset, littleEndian);
  }

  /**
   * Reads the next unsigned short.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readUint16(littleEndian?: boolean): number {
    const value = this.getUint16(this.#byteOffset, littleEndian);
    this.#byteOffset += 2;
    return value;
  }

  /**
   * Gets an signed integer.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getInt24(byteOffset: number, littleEndian?: boolean): number {
    const int = this.getUint24(byteOffset, littleEndian);

    return int & 0x800000 ? int ^ -0x1000000 : int;
  }

  /**
   * Reads the next signed integer.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readInt24(littleEndian?: boolean): number {
    const value = this.getInt24(this.#byteOffset, littleEndian);
    this.#byteOffset += 3;
    return value;
  }

  /**
   * Sets a signed integer.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setInt24(byteOffset: number, value: number, littleEndian?: boolean): void {
    return this.setUint24(
      byteOffset,
      value < 0 ? value | 0x1000000 : value,
      littleEndian,
    );
  }

  /**
   * Writes the next signed integer.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeInt24(value: number, littleEndian?: boolean): void {
    this.setInt24(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 4;
  }

  /**
   * Gets an unsigned integer.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getUint24(byteOffset: number, littleEndian?: boolean): number {
    const buffer = new Uint8Array(this.buffer);
    const order = littleEndian ? littleEndian24 : bigEndian24;

    const b0 = buffer[byteOffset + order[0]];
    const b1 = buffer[byteOffset + order[1]] << 0x8;
    const b2 = buffer[byteOffset + order[2]] << 0x10;

    return b0 | b1 | b2;
  }

  /**
   * Reads the next unsigned integer.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readUint24(littleEndian?: boolean): number {
    const value = this.getUint24(this.#byteOffset, littleEndian);
    this.#byteOffset += 3;
    return value;
  }

  /**
   * Sets an unsigned integer.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setUint24(byteOffset: number, value: number, littleEndian?: boolean): void {
    const buffer = new Uint8Array(this.buffer);
    const order = littleEndian ? littleEndian24 : bigEndian24;

    if (!boundsCheck(byteOffset, 3, buffer.length)) {
      return;
    }

    this.setInt8(byteOffset + order[0], value & 0xff);
    this.setInt8(byteOffset + order[1], (value >>> 0x8) & 0xff);
    this.setInt8(byteOffset + order[2], (value >>> 0x10) & 0xff);
  }

  /**
   * Writes the next signed integer.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeUint24(value: number, littleEndian?: boolean): void {
    this.setUint24(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 3;
  }

  /**
   * Sets an unsigned short.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setUint16(byteOffset: number, value: number, littleEndian?: boolean): void {
    super.setUint16(byteOffset, value, littleEndian);
  }

  /**
   * Writes the next signed short.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeUint16(value: number, littleEndian?: boolean): void {
    this.setUint16(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 2;
  }

  /**
   * Gets an signed integer.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getInt32(byteOffset: number, littleEndian?: boolean): number {
    return super.getInt32(byteOffset, littleEndian);
  }

  /**
   * Reads the next signed integer.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readInt32(littleEndian?: boolean): number {
    const value = this.getInt32(this.#byteOffset, littleEndian);
    this.#byteOffset += 4;
    return value;
  }

  /**
   * Sets a signed integer.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setInt32(byteOffset: number, value: number, littleEndian?: boolean): void {
    super.setInt32(byteOffset, value, littleEndian);
  }

  /**
   * Writes the next signed integer.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeInt32(value: number, littleEndian?: boolean): void {
    this.setInt32(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 4;
  }

  /**
   * Gets an unsigned integer.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getUint32(byteOffset: number, littleEndian?: boolean): number {
    return super.getUint32(byteOffset, littleEndian);
  }

  /**
   * Reads the next unsigned integer.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readUint32(littleEndian?: boolean): number {
    const value = this.getUint32(this.#byteOffset, littleEndian);
    this.#byteOffset += 4;
    return value;
  }

  /**
   * Sets an unsigned integer.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setUint32(byteOffset: number, value: number, littleEndian?: boolean): void {
    super.setUint32(byteOffset, value, littleEndian);
  }

  /**
   * Writes the next signed integer.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeUint32(value: number, littleEndian?: boolean): void {
    this.setUint32(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 4;
  }

  /**
   * Gets a float.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getFloat32(byteOffset: number, littleEndian?: boolean): number {
    return super.getFloat32(byteOffset, littleEndian);
  }

  /**
   * Reads the next float.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readFloat32(littleEndian?: boolean): number {
    const value = this.getFloat32(this.#byteOffset, littleEndian);
    this.#byteOffset += 4;
    return value;
  }

  /**
   * Sets a float.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setFloat32(byteOffset: number, value: number, littleEndian?: boolean): void {
    super.setFloat32(byteOffset, value, littleEndian);
  }

  /**
   * Writes the next float.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeFloat32(value: number, littleEndian?: boolean): void {
    this.setFloat32(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 4;
  }

  /**
   * Gets a double.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getFloat64(byteOffset: number, littleEndian?: boolean): number {
    return super.getFloat64(byteOffset, littleEndian);
  }

  /**
   * Reads the next double.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readFloat64(littleEndian?: boolean): number {
    const value = this.getFloat64(this.#byteOffset, littleEndian);
    this.#byteOffset += 8;
    return value;
  }

  /**
   * Sets a double.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setFloat64(byteOffset: number, value: number, littleEndian?: boolean): void {
    super.setFloat64(byteOffset, value, littleEndian);
  }

  /**
   * Writes the next double.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeFloat64(value: number, littleEndian?: boolean): void {
    this.setFloat64(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 8;
  }

  /**
   * Gets an signed long.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getBigInt64(byteOffset: number, littleEndian?: boolean): bigint {
    return super.getBigInt64(byteOffset, littleEndian);
  }

  /**
   * Reads the next signed long.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readBigInt64(littleEndian?: boolean): bigint {
    const value = this.getBigInt64(this.#byteOffset, littleEndian);
    this.#byteOffset += 8;
    return value;
  }

  /**
   * Sets a signed long.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setBigInt64(byteOffset: number, value: bigint, littleEndian?: boolean): void {
    super.setBigInt64(byteOffset, value, littleEndian);
  }

  /**
   * Writes the next signed long.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeBigInt64(value: bigint, littleEndian?: boolean): void {
    this.setBigInt64(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 8;
  }

  /**
   * Gets an unsigned long.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getBigUint64(byteOffset: number, littleEndian?: boolean): bigint {
    return super.getBigUint64(byteOffset, littleEndian);
  }

  /**
   * Reads the next unsigned long.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readBigUint64(littleEndian?: boolean): bigint {
    const value = this.getBigUint64(this.#byteOffset, littleEndian);
    this.#byteOffset += 8;
    return value;
  }

  /**
   * Sets an unsigned long.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setBigUint64(
    byteOffset: number,
    value: bigint,
    littleEndian?: boolean,
  ): void {
    super.setBigUint64(byteOffset, value, littleEndian);
  }

  /**
   * Writes the next unsigned long.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeBigUint64(value: bigint, littleEndian?: boolean): void {
    this.setBigUint64(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 8;
  }

  /**
   * Gets an signed long.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getInt64(byteOffset: number, littleEndian?: boolean): number {
    return Number(this.getBigInt64(byteOffset, littleEndian));
  }

  /**
   * Reads the next signed long.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readInt64(littleEndian?: boolean): number {
    const value = this.getInt64(this.#byteOffset, littleEndian);
    this.#byteOffset += 8;
    return value;
  }

  /**
   * Sets a signed long.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setInt64(byteOffset: number, value: number, littleEndian?: boolean): void {
    this.setBigInt64(byteOffset, BigInt(value), littleEndian);
  }

  /**
   * Writes the next signed long.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeInt64(value: number, littleEndian?: boolean): void {
    this.setInt64(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 8;
  }

  /**
   * Gets an unsigned long.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getUint64(byteOffset: number, littleEndian?: boolean): number {
    return Number(this.getBigUint64(byteOffset, littleEndian));
  }

  /**
   * Reads the next unsigned long.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readUint64(littleEndian?: boolean): number {
    const value = this.getUint64(this.#byteOffset, littleEndian);
    this.#byteOffset += 8;
    return value;
  }

  /**
   * Sets an unsigned long.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setUint64(byteOffset: number, value: number, littleEndian?: boolean): void {
    this.setBigUint64(byteOffset, BigInt(value), littleEndian);
  }

  /**
   * Writes the next signed long.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeUint64(value: number, littleEndian?: boolean): void {
    this.setUint64(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 8;
  }

  /**
   * Gets a signed, variable-length integer.
   * @param byteOffset The byte offset.
   * @param maxByteLength The maximum byte length.
   * @returns The result.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#varints
   */
  getVarInt(byteOffset: number, maxByteLength: number = 10): IntResult {
    let value = 0;
    let byteLength = 0;
    for (let bitShift = 0; byteLength < maxByteLength; bitShift += 7) {
      const byte = this.getUint8(byteOffset + byteLength++);
      value |= (byte & 0b0111_1111) << bitShift;
      if ((byte & 0b1000_0000) === 0) {
        return { value, byteLength };
      }
    }
    throw new RangeError(
      'VarInt must be between 1 and ' + maxByteLength + ' bytes.',
    );
  }

  /**
   * Reads the next signed, variable-length integer.
   * @param maxByteLength The maximum byte length.
   * @returns The value.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#varints
   */
  readVarInt(maxByteLength?: number): number {
    const { value, byteLength } = this.getVarInt(
      this.#byteOffset,
      maxByteLength,
    );
    this.#byteOffset += byteLength;
    return value;
  }

  /**
   * Sets a signed, variable-length integer.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param maxByteLength The maximum byte length.
   * @returns The byte length.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#varints
   */
  setVarInt(
    byteOffset: number,
    value: number,
    maxByteLength: number = 10,
  ): number {
    for (let byteLength = 1; byteLength <= maxByteLength; byteLength++) {
      let byte = value & 0b0111_1111;
      value >>>= 7;
      if (value !== 0) {
        byte |= 0b1000_0000;
      }
      this.setUint8(byteOffset++, byte);
      if (value === 0) {
        return byteLength;
      }
    }
    throw new RangeError(
      'VarInt must be between 1 and ' + maxByteLength + ' bytes.',
    );
  }

  /**
   * Writes the next signed, variable-length integer.
   * @param value The value.
   * @param maxByteLength The maximum byte length.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#varints
   */
  writeVarInt(value: number, maxByteLength?: number): void {
    const byteLength = this.setVarInt(this.#byteOffset, value, maxByteLength);
    this.#byteOffset += byteLength;
  }

  /**
   * Gets an unsigned, variable-length integer.
   * @param byteOffset The byte offset.
   * @param maxByteLength The maximum byte length.
   * @returns The result.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#varints
   */
  getVarUint(byteOffset: number, maxByteLength?: number): IntResult {
    const { value, byteLength } = this.getVarInt(byteOffset, maxByteLength);
    return { value: value >>> 0, byteLength };
  }

  /**
   * Reads the next unsigned, variable-length integer.
   * @param maxByteLength The maximum byte length.
   * @returns The value.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#varints
   */
  readVarUint(maxByteLength?: number): number {
    const { value, byteLength } = this.getVarUint(
      this.#byteOffset,
      maxByteLength,
    );
    this.#byteOffset += byteLength;
    return value;
  }

  /**
   * Sets an unsigned, variable-length integer.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param maxByteLength The maximum byte length.
   * @returns The byte length.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#varints
   */
  setVarUint(
    byteOffset: number,
    value: number,
    maxByteLength?: number,
  ): number {
    return this.setVarInt(byteOffset, value >>> 0, maxByteLength);
  }

  /**
   * Writes the next unsigned, variable-length integer.
   * @param value The value.
   * @param maxByteLength The maximum byte length.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#varints
   */
  writeVarUint(value: number, maxByteLength?: number): void {
    const byteLength = this.setVarUint(this.#byteOffset, value, maxByteLength);
    this.#byteOffset += byteLength;
  }

  /**
   * Gets a signed, variable-length integer with zigzag encoding.
   * @param byteOffset The byte offset.
   * @param maxByteLength The maximum byte length.
   * @returns The result.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#signed_integers
   */
  getVarZint(byteOffset: number, maxByteLength?: number): IntResult {
    const { value, byteLength } = this.getVarInt(byteOffset, maxByteLength);
    return { value: (value >> 1) ^ -(value & 1), byteLength };
  }

  /**
   * Reads the next signed, variable-length integer with zigzag encoding.
   * @param maxByteLength The maximum byte length.
   * @returns The value.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#varints
   */
  readVarZint(maxByteLength?: number): number {
    const { value, byteLength } = this.getVarZint(
      this.#byteOffset,
      maxByteLength,
    );
    this.#byteOffset += byteLength;
    return value;
  }

  /**
   * Sets a signed, variable-length integer with zigzag encoding.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param maxByteLength The maximum byte length.
   * @returns The byte length.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#signed_integers
   */
  setVarZint(
    byteOffset: number,
    value: number,
    maxByteLength?: number,
  ): number {
    return this.setVarInt(
      byteOffset,
      (value >> 31) ^ (value << 1),
      maxByteLength,
    );
  }

  /**
   * Writes the next unsigned, variable-length integer with zigzag encoding.
   * @param value The value.
   * @param maxByteLength The maximum byte length.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#varints
   */
  writeVarZint(value: number, maxByteLength?: number): void {
    const byteLength = this.setVarZint(this.#byteOffset, value, maxByteLength);
    this.#byteOffset += byteLength;
  }

  /**
   * Gets an array of unsigned bytes.
   * @param byteOffset The byte offset.
   * @param byteLength The byte length.
   * @returns The value.
   */
  getUint8Array(byteOffset: number, byteLength?: number): Uint8Array {
    return new Uint8Array(
      this.buffer,
      super.byteOffset + byteOffset,
      byteLength,
    );
  }

  /**
   * Reads the next array of unsigned bytes.
   * @param byteLength The byte length.
   * @returns The value.
   */
  readUint8Array(byteLength?: number): Uint8Array {
    const value = this.getUint8Array(this.#byteOffset, byteLength);
    this.#byteOffset += value.byteLength;
    return value;
  }

  /**
   * Sets an array of unsigned bytes.
   * @param byteOffset The byte offset.
   * @param value The value.
   */
  setUint8Array(byteOffset: number, value: Uint8Array): void {
    const byteLength = value.byteLength;
    this.getUint8Array(byteOffset, byteLength).set(value);
  }

  /**
   * Writes the next array of unsigned bytes.
   * @param value The value.
   */
  writeUint8Array(value: Uint8Array): void {
    this.setUint8Array(this.#byteOffset, value);
    this.#byteOffset += value.byteLength;
  }

  /**
   * Gets an array of unsigned shorts.
   * @param byteOffset The byte offset.
   * @param byteLength The byte length.
   * @returns The value.
   */
  getUint16Array(byteOffset: number, byteLength?: number): Uint16Array {
    if (byteLength !== undefined) {
      byteLength = Math.floor(byteLength / 2);
    }
    return new Uint16Array(
      this.buffer,
      super.byteOffset + byteOffset,
      byteLength,
    );
  }

  /**
   * Reads the next array of unsigned shorts.
   * @param byteLength The byte length.
   * @returns The value.
   */
  readUint16Array(byteLength?: number): Uint16Array {
    const value = this.getUint16Array(this.#byteOffset, byteLength);
    this.#byteOffset += value.byteLength;
    return value;
  }

  /**
   * Sets an array of unsigned bytes.
   * @param byteOffset The byte offset.
   * @param value The value.
   */
  setUint16Array(byteOffset: number, value: Uint16Array): void {
    const byteLength = value.byteLength;
    this.getUint16Array(byteOffset, byteLength).set(value);
  }

  /**
   * Writes the next array of unsigned bytes.
   * @param value The value.
   */
  writeUint16Array(value: Uint16Array): void {
    this.setUint16Array(this.#byteOffset, value);
    this.#byteOffset += value.byteLength;
  }

  /**
   * Gets a string.
   * @param byteOffset The byte offset.
   * @param byteLength The byte length.
   * @param byteEncoding The byte encoding.
   * @returns The value.
   */
  getString(
    byteOffset: number,
    byteLength?: number,
    byteEncoding?: BufferEncoding,
  ): string {
    const decoder = new TextDecoder(byteEncoding || 'utf-8');
    const encoded = this.getUint8Array(byteOffset, byteLength);
    return decoder.decode(encoded);
  }

  /**
   * Reads the next string.
   * @param byteLength The byte length.
   * @param byteEncoding The byte encoding.
   * @returns The value.
   */
  readString(byteLength?: number, byteEncoding?: BufferEncoding): string {
    const value = this.getString(this.#byteOffset, byteLength, byteEncoding);
    if (byteLength === undefined) {
      this.#byteOffset = this.byteLength;
    } else {
      this.#byteOffset += byteLength;
    }
    return value;
  }

  /**
   * Sets a string.
   * @param byteOffset The byte offset.
   * @param value The string.
   * @param byteEncoding The byte encoding.
   * @returns The byte length.
   */
  setString(
    byteOffset: number,
    value: string,
    byteEncoding?: BufferEncoding,
  ): number {
    // TODO: add support for "utf-16-be" and "utf-16-le"
    if (byteEncoding && byteEncoding !== 'utf-8') {
      throw new TypeError(
        "String encoding '" + byteEncoding + "' is not supported",
      );
    }
    const encoder = new TextEncoder();
    const byteLength = Math.min(this.byteLength - byteOffset, value.length * 4);
    const destination = this.getUint8Array(byteOffset, byteLength);
    const { written } = encoder.encodeInto(value, destination);
    return written || 0;
  }

  /**
   * Writes the next a string.
   * @param value The string.
   * @param byteEncoding The byte encoding.
   */
  writeString(value: string, byteEncoding?: BufferEncoding): void {
    const byteLength = this.setString(this.#byteOffset, value, byteEncoding);
    this.#byteOffset += byteLength;
  }

  /**
   * Gets a String with a variable-length delimeter.
   * @param byteOffset The byte offset.
   * @param maxByteLength The maximum byte length.
   * @returns The result.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#strings
   */
  getVarString(byteOffset: number, maxByteLength?: number): StringResult {
    const { value: byteLength, byteLength: delimeterOffset } =
      this.getVarUint(byteOffset);
    if (maxByteLength !== undefined && byteLength > maxByteLength) {
      throw new RangeError(
        'VarString must be less than or equal to ' + maxByteLength + ' bytes.',
      );
    }
    const value = this.getString(byteOffset + delimeterOffset, byteLength);
    return { value, byteLength: byteLength + delimeterOffset };
  }

  /**
   * Reads the next String with a variable-length delimeter.
   * @param maxByteLength The maximum byte length.
   * @returns The value.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#strings
   */
  readVarString(maxByteLength?: number): string {
    const { value, byteLength } = this.getVarString(
      this.#byteOffset,
      maxByteLength,
    );
    this.#byteOffset += byteLength;
    return value;
  }

  /**
   * Sets a String with a variable-length delimeter.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @returns The byte length.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#strings
   */
  setVarString(byteOffset: number, value: string): number {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(value);
    const byteLength = encoded.byteLength;
    const delimeterOffset = this.setVarInt(byteOffset, byteLength);
    this.setUint8Array(byteOffset + delimeterOffset, encoded);
    return delimeterOffset + byteLength;
  }

  /**
   * Writes the next String with a variable-length delimeter.
   * @param value The value.
   * @link https://developers.google.com/protocol-buffers/docs/encoding#strings
   */
  writeVarString(value: string): number {
    const byteLength = this.setVarString(this.#byteOffset, value);
    this.#byteOffset += byteLength;
    return byteLength;
  }

  /**
   * Formats to a string.
   * @param format The string format.
   * @returns The string.
   */
  toString(format?: string): string {
    return Array.prototype.map
      .call(this.getUint8Array(0), function (byte: number): string {
        switch (format) {
          case 'hex':
            return ('00' + byte.toString(16)).slice(-2);
          default:
            return byte.toString(10);
        }
      })
      .join(' ');
  }
  readBytes(length: number): Uint8Array {
    if (length > this.bytesRemaining) {
      throw new Error('EOF');
    }
    const value = this.getUint8Array(this.#byteOffset, length);
    this.#byteOffset += length;
    return value;
  }
}

/**
 * A number result.
 */
interface IntResult {
  /**
   * The byte length.
   */
  readonly byteLength: number;
  /**
   * The value.
   */
  readonly value: number;
}

/**
 * A string result.
 */
interface StringResult {
  /**
   * The byte length.
   */
  readonly byteLength: number;
  /**
   * The value.
   */
  readonly value: string;
}
