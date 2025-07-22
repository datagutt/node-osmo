import { ByteBuf } from '../src/bytebuf.js';

let errorSpy: jest.SpyInstance
describe('ByteBuf Class Tests', () => {
  beforeAll(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy.mockRestore();
  });

  let byteBuf;

  beforeEach(() => {
    errorSpy.mockClear();

    // Initialize a buffer with 10 bytes for testing
    byteBuf = new ByteBuf(new ArrayBuffer(10));
  });

  test('from buffer', () => {
    ByteBuf.from(new ArrayBuffer(10));
    ByteBuf.from(new ArrayBuffer(10), 2);
    ByteBuf.from(new ArrayBuffer(10), 2, 5);

    ByteBuf.from(Buffer.from(Uint8Array.from([0x01, 0x02, 0x03, 0x04]).buffer));

  });

  // Resetting the buffer after reading or writing
  test('should skip the buffer correctly', () => {
    byteBuf.writeInt8(100);
    byteBuf.skip(3);
    byteBuf.writeInt8(120);
    byteBuf.reset();
    expect(byteBuf.getInt8(0)).toBe(100);
    expect(byteBuf.getInt8(4)).toBe(120);

    byteBuf.reset();
    expect(byteBuf.readInt8()).toBe(100);
    byteBuf.skip(3);
    expect(byteBuf.readInt8()).toBe(120);

    byteBuf.reset();
    expect(byteBuf.byteOffset).toBe(0);
    byteBuf.skip(3);
    expect(byteBuf.byteOffset).toBe(3);
    byteBuf.readInt8();
    expect(byteBuf.byteOffset).toBe(4);
  });

  // Resetting the buffer after reading or writing
  test('should reset the buffer correctly', () => {
    byteBuf.writeInt8(100);
    byteBuf.reset();
    expect(byteBuf.readInt8()).toBe(100);

    byteBuf.reset();
    byteBuf.writeInt8(200); // 200 - 256 = -56 cause goes to 127
    byteBuf.reset();
    expect(byteBuf.readInt8()).toBe(-56);
  });

  // Clear the buffer
  test('should clear the buffer correctly', () => {
    byteBuf.writeInt8(100);
    byteBuf.clear();
    byteBuf.reset();
    expect(byteBuf.readInt8()).toBe(0);
  });

  // Boolean Read/Write Tests
  test('should read and write boolean', () => {
    byteBuf.writeBool(false);
    byteBuf.reset();
    expect(byteBuf.readBool()).toBe(false);

    byteBuf.reset();
    byteBuf.writeBool(true);
    byteBuf.reset();
    expect(byteBuf.readBool()).toBe(true);
  });

  test('should set and get boolean at specific byteOffset', () => {
    byteBuf.writeBool(true);
    byteBuf.setBool(3, false);
    byteBuf.reset();
    expect(byteBuf.readBool(0)).toBe(true);
    expect(byteBuf.readBool(3)).toBe(false);
  });

  // Boundary Check Tests
  test('should handle writing beyond buffer size', () => {
    byteBuf.writeInt8(100);
    expect(() => byteBuf.writeInt8(200)) // .toThrowError('Tried to write 1 bytes past the end of a buffer at offset 0x1 of 0xa');
  });

  // Integer Read/Write Tests
  test('should read and write Int8', () => {
    byteBuf.writeInt8(127);
    byteBuf.reset();
    expect(byteBuf.readInt8()).toBe(127);
  });

  test('should read and write Uint8', () => {
    byteBuf.writeUint8(255);
    byteBuf.reset();
    expect(byteBuf.readUint8()).toBe(255);
  });

  test('should read and write Int16', () => {
    byteBuf.writeInt16(32767);
    byteBuf.reset();
    expect(byteBuf.readInt16()).toBe(32767);
  });

  test('should read and write Uint16', () => {
    byteBuf.writeUint16(65535);
    byteBuf.reset();
    expect(byteBuf.readUint16()).toBe(65535);
  });

  test('should read and write Int24', () => {
    byteBuf.writeInt24(8388607);
    byteBuf.reset();
    expect(byteBuf.readInt24()).toBe(8388607);

    byteBuf.reset();
    byteBuf.writeInt24(-8388607);
    byteBuf.reset();
    expect(byteBuf.readInt24()).toBe(-8388607);
  });

  test('should read and write Uint24', () => {
    byteBuf.writeUint24(16777215);
    byteBuf.reset();
    expect(byteBuf.readUint24()).toBe(16777215);

    byteBuf.reset();
    byteBuf.writeUint24(16777215, true);
    byteBuf.reset();
    expect(byteBuf.readUint24(true)).toBe(16777215);

    byteBuf.reset();
    byteBuf.setUint24(-1, 16777215);
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toBe('Tried to write to a negative offset');

    byteBuf.reset();
    byteBuf.setUint24(byteBuf.byteLength, 16777215);
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[1][0]).toContain('Tried to write 3 bytes past the end of a buffer at offset 0x');
  });

  test('should read and write Int32', () => {
    byteBuf.writeInt32(2147483647);
    byteBuf.reset();
    expect(byteBuf.readInt32()).toBe(2147483647);
  });

  test('should read and write Uint32', () => {
    byteBuf.writeUint32(4294967295);
    byteBuf.reset();
    expect(byteBuf.readUint32()).toBe(4294967295);
  });

  test('should read and write Float32', () => {
    byteBuf.writeFloat32(3.14);
    byteBuf.reset();
    expect(byteBuf.readFloat32()).toBeCloseTo(3.14, 5);
  });

  test('should read and write Float64', () => {
    byteBuf.writeFloat64(3.14159265359);
    byteBuf.reset();
    expect(byteBuf.readFloat64()).toBeCloseTo(3.14159265359, 10);
  });

  test('should read and write Int64', () => {
    const bigInt = BigInt(9007199254740991);
    byteBuf.writeInt64(bigInt);
    byteBuf.reset();
    expect(byteBuf.readInt64().toString()).toBe(bigInt.toString());
  });

  test('should read and write Uint64', () => {
    const bigUint = BigInt(9007199254740991);
    byteBuf.writeUint64(bigUint);
    byteBuf.reset();
    expect(byteBuf.readUint64().toString()).toBe(bigUint.toString());
  });

  test('should read and write BigInt64', () => {
    const bigInt = BigInt(9007199254740991);
    byteBuf.writeBigInt64(bigInt);
    byteBuf.reset();
    expect(byteBuf.readBigInt64().toString()).toBe(bigInt.toString());
  });

  test('should read and write BigUint64', () => {
    const bigUint = BigInt(9007199254740991);
    byteBuf.writeBigUint64(bigUint);
    byteBuf.reset();
    expect(byteBuf.readBigUint64().toString()).toBe(bigUint.toString());
  });

  // VarInt, VarUint, VarZint Tests
  test('should read and write VarInt', () => {
    byteBuf.writeVarInt(100);
    byteBuf.reset();
    expect(byteBuf.readVarInt()).toBe(100);

    byteBuf.reset();
    expect(() => {
      byteBuf.writeVarInt(300, 1);
    }).toThrowError(
      `VarInt must be between 1 and 1 bytes.`
    );

    byteBuf.reset();
    expect(() => {
      byteBuf.readVarInt(1);
    }).toThrowError(
      `VarInt must be between 1 and 1 bytes.`
    );
  });

  test('should read and write VarUint', () => {
    byteBuf.writeVarUint(100);
    byteBuf.reset();
    expect(byteBuf.readVarUint()).toBe(100);
  });

  test('should read and write VarZint', () => {
    byteBuf.writeVarZint(100);
    byteBuf.reset();
    expect(byteBuf.readVarZint()).toBe(100);
  });

  // String Read/Write Tests
  test('should read and write string', () => {
    byteBuf.writeString('hello');
    byteBuf.reset();
    expect(byteBuf.readString(5)).toBe('hello');

    byteBuf.reset();
    byteBuf.writeString('helloworld');
    byteBuf.reset();
    expect(byteBuf.readString()).toBe('helloworld');

    byteBuf.reset();
    byteBuf.writeString(''); // written || 0 tesitng

    byteBuf.reset();
    expect(() => {
      byteBuf.writeString('Hello', 'utf-16');
    }).toThrowError(
      `String encoding 'utf-16' is not supported`
    );
  });

  test('should read and write VarString', () => {
    byteBuf.writeVarString('hello');
    byteBuf.reset();
    expect(byteBuf.readVarString()).toBe('hello');

    byteBuf.reset();
    const count = byteBuf.writeVarString('hello') - 1;
    byteBuf.reset();
    expect(() => {
      byteBuf.readVarString(count - 1);
    }).toThrowError(
      `VarString must be less than or equal to ${count - 1} bytes.`
    );
  });

  // Array Read/Write Tests
  test('should read and write Uint8Array', () => {
    const arr = new Uint8Array([1, 2, 3, 4, 5]);
    byteBuf.writeUint8Array(arr);
    byteBuf.reset();
    expect(byteBuf.readUint8Array(5)).toEqual(arr);
  });

  test('should read and write Uint16Array', () => {
    const arr = new Uint16Array([1, 2, 3, 4, 5]);
    byteBuf.writeUint16Array(arr);
    byteBuf.reset();
    expect(byteBuf.readUint16Array(5 * 2)).toEqual(arr);
  });

  test('should correctly convert the buffer to a string in hex or decimal format', () => {
    // Write some values into the buffer
    byteBuf.writeUint8(10);  // 0x0A
    byteBuf.writeUint8(20);  // 0x14
    byteBuf.writeUint8(30);  // 0x1E
    byteBuf.writeUint8(40);  // 0x28
    byteBuf.writeUint8(50);  // 0x32

    // Convert to hex and check if the result matches the expected hex string
    const hexString = byteBuf.toString('hex');
    expect(hexString).toBe('0a 14 1e 28 32 00 00 00 00 00');

    // Convert to decimal and check if the result matches the expected decimal string
    const decString = byteBuf.toString('dec');
    expect(decString).toBe('10 20 30 40 50 0 0 0 0 0');
  });

  test('should throw error when reading beyond buffer size', () => {
    expect(() => byteBuf.readBytes(11)).toThrowError('EOF');

    byteBuf.reset();
    expect(byteBuf.readBytes(10)).toEqual(Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));

    byteBuf.reset();
    byteBuf.writeUint8(10);  // 0x0A
    byteBuf.writeUint8(20);  // 0x14
    byteBuf.writeUint8(30);  // 0x1E
    byteBuf.writeUint8(40);  // 0x28
    byteBuf.writeUint8(50);  // 0x32
    byteBuf.reset();
    expect(byteBuf.readBytes(5)).toEqual(Uint8Array.from([10, 20, 30, 40, 50]));
  });
});
