export default class BufferContainer {
    #buffer = null;

    constructor(buffer) {
        this.#buffer = buffer;
    }

    alloc(bytes) {
        return new BufferContainer(Buffer.alloc(bytes));
    }

    get length() {
        return this.#buffer.length;
    }

    get buffer() {
        return this.#buffer;
    }

    //
    // Write
    //

    writeInt8(offset, value) {
        return this.#buffer.writeInt8(value, offset);
    }

    writeUInt8(offset, value) {
        return this.#buffer.writeUInt8(value, offset);
    }

    writeInt16(offset, value) {
        return this.#buffer.writeInt16BE(value, offset);
    }

    writeUInt16(offset, value) {
        return this.#buffer.writeUInt16BE(value, offset);
    }

    writeInt32(offset, value) {
        return this.#buffer.writeInt32BE(value, offset);
    }

    writeUInt32(offset, value) {
        return this.#buffer.writeUInt32BE(value, offset);
    }

    writeBigInt64(offset, value) {
        return this.#buffer.writeBigInt64BE(value, offset);
    }

    writeBigUInt64(offset, value) {
        return this.#buffer.writeBigUInt64BE(value, offset);
    }

    writeFloat32(offset, value) {
        return this.#buffer.writeFloatBE(value, offset);
    }

    writeFloat64(offset, value) {
        return this.#buffer.writeDoubleBE(value, offset);
    }

    //
    // Read
    //

    readInt8(offset) {
        return this.#buffer.readInt8(offset);
    }

    readUInt8(offset) {
        return this.#buffer.readUInt8(offset);
    }

    readInt16(offset) {
        return this.#buffer.readInt16BE(offset);
    }

    readUInt16(offset) {
        return this.#buffer.readUInt16BE(offset);
    }

    readInt32(offset) {
        return this.#buffer.readInt32BE(offset);
    }

    readUInt32(offset) {
        return this.#buffer.readUInt32BE(offset);
    }

    readBigInt64(offset) {
        return this.#buffer.readBigInt64BE(offset);
    }

    readBigUInt64(offset) {
        return this.#buffer.readBigUInt64BE(offset);
    }

    readFloat32(offset) {
        return this.#buffer.readFloatBE(offset);
    }

    readFloat64(offset) {
        return this.#buffer.readDoubleBE(offset);
    }
}