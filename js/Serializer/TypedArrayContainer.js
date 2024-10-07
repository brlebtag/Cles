export default class TypedArrayContainer {
    #buffer = null;

    constructor(buffer) {
        this.#buffer = new DataView(buffer);
    }

    alloc(bytes) {
        return new TypedArrayContainer(new ArrayBuffer(bytes));
    }

    get length() {
        return this.#buffer.byteLength;
    }

    get buffer() {
        return this.#buffer;
    }

    //
    // Write
    //

    writeInt8(offset, value) {
        return this.#buffer.setInt8(offset, value);
    }

    writeUInt8(offset, value) {
        return this.#buffer.setUint8(offset, value);
    }

    writeInt16(offset, value) {
        return this.#buffer.setInt16(offset, value);
    }

    writeUInt16(offset, value) {
        return this.#buffer.setUint16(offset, value);
    }

    writeInt32(offset, value) {
        return this.#buffer.setInt32(offset, value);
    }

    writeUInt32(offset, value) {
        return this.#buffer.setUint32(offset, value);
    }

    writeBigInt64(offset, value) {
        return this.#buffer.setBigInt64(offset, value);
    }

    writeBigUInt64(offset, value) {
        return this.#buffer.setBigUint64(offset, value);
    }

    writeFloat32(offset, value) {
        return this.#buffer.setFloat32(offset, value);
    }

    writeFloat64(offset, value) {
        return this.#buffer.setFloat64(offset, value);
    }

    //
    // Read
    //

    readInt8(offset) {
        return this.#buffer.getInt8(offset);
    }

    readUInt8(offset) {
        return this.#buffer.getUint8(offset);
    }

    readInt16(offset) {
        return this.#buffer.getInt16(offset);
    }

    readUInt16(offset) {
        return this.#buffer.getUint16(offset);
    }

    readInt32(offset) {
        return this.#buffer.getInt32(offset);
    }

    readUInt32(offset) {
        return this.#buffer.getUint32(offset);
    }

    readBigInt64(offset) {
        return this.#buffer.getBigInt64(offset);
    }

    readBigUInt64(offset) {
        return this.#buffer.getBigUint64(offset);
    }

    readFloat32(offset) {
        return this.#buffer.getFloat32(offset);
    }

    readFloat64(offset) {
        return this.#buffer.getFloat64(offset);
    }
}