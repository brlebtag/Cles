export default class BufferStream {
    constructor(buf) {
        this.bytes = 0;
        this.bits = 8;
        this.remainder = 0x0;
        this.buf = buf;
        this.length = buf.length;
        this.temp = Buffer.alloc(8);
    }

    skipBit() {
        this.bits--;
        if (this.bits == 0) {
            this.bits = 8;
        }
    }

    skipBits(bits) {
        this.bytes -= Math.floor(bits / 8);
        this.bits = (bits + this.bits) % 8;
        if (this.bits == 0) {
            this.bits = 8;
        }
    }

    writeBit() {
        this.remainder = this.remainder | 1 << (this.bits - 1);
        this.bits--;

        if (this.bits == 0) {
            this.bits = 8;
            this.buf.writeUInt8(this.remainder, this.bytes++);
            this.remainder = 0x0;
        }
    }

    writeBits(bits, value) {
        console.assert(bits > 0 && bits <= 64);
        this.temp.writeBigUInt64BE(value);
        this.#consumeBitsFrom(this.temp, this.buf, this.remainder, bits);
        return this;
    }

    // int8

    writeInt8(value) {
        if (this.bits === 8) {
            this.buf.writeInt8(value, this.bytes++);
        } else {
            this.temp.writeInt8(value);
            this.remainder = this.#copyTo(this.temp, this.buf, this.remainder, 1);
        }
        return this;
    }

    readInt8() {
        if (this.bits === 8) {
            const ret = this.buf.readInt8(this.bytes++);
            return ret;
            
        } else {
            this.remainder = this.#copyTo(this.buf, this.temp, this.remainder, 1);
            return this.temp.readInt8(0);
        }
    }

    peakInt8() {
        if (this.bits === 8) return this.buf.readInt8(this.bytes);
        this.#peakTo(this.buf, this.temp, this.remainder, this.bits, this.bytes, 1);
        return this.temp.readInt8(0);
    }

    // Uint8

    writeUInt8(value) {
        if (this.bits === 8) {
            this.buf.writeUInt8(value, this.bytes++);
        } else {
            this.temp.writeUInt8(value);
            this.remainder = this.#copyTo(this.temp, this.buf, this.remainder, 1);
        }
        return this;
    }

    readUInt8() {
        if (this.bits === 8) {
            const ret = this.buf.readUInt8(this.bytes++);
            return ret;
            
        } else {
            this.remainder = this.#copyTo(this.buf, this.temp, this.remainder, 1);
            return this.temp.readUInt8(0);
        }
    }

    peakUInt8() {
        if (this.bits === 8) return this.buf.readUInt8(this.bytes);
        this.#peakTo(this.buf, this.temp, this.remainder, this.bits, this.bytes, 1);
        return this.temp.readUInt8(0);
    }

    // Int16

    writeInt16(value) {
        if (this.bits === 8) {
            this.buf.writeInt16BE(value, this.bytes);
            this.bytes += 2;
        } else {
            this.temp.writeInt16BE(value);
            this.remainder = this.#copyTo(this.temp, this.buf, this.remainder, 2);
        }
        return this;
    }

    readInt16() {
        if (this.bits === 8) {
            const ret = this.buf.readInt16BE(this.bytes);
            this.bytes += 2;
            return ret;
        } else {
            this.remainder = this.#copyTo(this.buf, this.temp, this.remainder, 2);
            return this.temp.readInt16BE(0);
        }
    }

    peakInt16() {
        if (this.bits === 8) return this.buf.readInt16BE(this.bytes);
        this.#peakTo(this.buf, this.temp, this.remainder, this.bits, this.bytes, 2);
        return this.temp.readInt16BE(0);
    }

    // UInt16

    writeUInt16(value) {
        if (this.bits === 8) {
            this.buf.writeUInt16BE(value, this.bytes);
            this.bytes += 2;
        } else {
            this.temp.writeUInt16BE(value);
            this.remainder = this.#copyTo(this.temp, this.buf, this.remainder, 2);
        }
        return this;
    }

    readUInt16() {
        if (this.bits === 8) {
            const ret = this.buf.readUInt16BE(this.bytes);
            this.bytes += 2;
            return ret;
        } else {
            this.remainder = this.#copyTo(this.buf, this.temp, this.remainder, 2);
            return this.temp.readUInt16BE(0);
        }
    }

    peakUInt16() {
        if (this.bits === 8) return this.buf.readUInt16BE(this.bytes);
        this.#peakTo(this.buf, this.temp, this.remainder, this.bits, this.bytes, 2);
        return this.temp.readUInt16BE(0);
    }

    // Int32

    writeInt32(value) {
        if (this.bits === 8) {
            this.buf.writeInt32BE(value, this.bytes);
            this.bytes += 4;
        } else {
            this.temp.writeInt32BE(value);
            this.remainder = this.#copyTo(this.temp, this.buf, this.remainder, 4);
        }
        return this;
    }

    readInt32() {
        if (this.bits === 8) {
            const ret = this.buf.readInt32BE(this.bytes);
            this.bytes += 4;
            return ret;
        } else {
            this.remainder = this.#copyTo(this.buf, this.temp, this.remainder, 4);
            return this.temp.readInt32BE(0);
        }
    }

    peakInt32() {
        if (this.bits === 8) return this.buf.readInt32BE(this.bytes);
        this.#peakTo(this.buf, this.temp, this.remainder, this.bits, this.bytes, 4);
        return this.temp.readInt32BE(0);
    }

    // UInt32

    writeUInt32(value) {
        if (this.bits === 8) {
            this.buf.writeUInt32BE(value, this.bytes);
            this.bytes += 4;
        } else {
            this.temp.writeUInt32BE(value);
            this.remainder = this.#copyTo(this.temp, this.buf, this.remainder, 4);
        }
        return this;
    }

    readUInt32() {
        if (this.bits === 8) {
            const ret = this.buf.readUInt32BE(this.bytes);
            this.bytes += 4;
            return ret;
        } else {
            this.remainder = this.#copyTo(this.buf, this.temp, this.remainder, 4);
            return this.temp.readUInt32BE(0);
        }
    }

    peakUInt32() {
        if (this.bits === 8) return this.buf.readUInt32BE(this.bytes);
        this.#peakTo(this.buf, this.temp, this.remainder, this.bits, this.bytes, 4);
        return this.temp.readUInt32BE(0);
    }

    // BigInt64

    writeBigInt64(value) {
        if (this.bits === 8) {
            this.buf.writeBigInt64BE(value, this.bytes);
            this.bytes += 8;
        } else {
            this.temp.writeBigInt64BE(value);
            this.remainder = this.#copyTo(this.temp, this.buf, this.remainder, 8);
        }
        return this;
    }

    readBigInt64() {
        if (this.bits === 8) {
            const ret = this.buf.readBigInt64BE(this.bytes);
            this.bytes += 8;
            return ret;
        } else {
            this.remainder = this.#copyTo(this.buf, this.temp, this.remainder, 8);
            return this.temp.readBigInt64BE(0);
        }
    }

    peakBigInt64() {
        if (this.bits === 8) return this.buf.readBigInt64BE(this.bytes);
        this.#peakTo(this.buf, this.temp, this.remainder, this.bits, this.bytes, 8);
        return this.temp.readBigInt64BE(0);
    }

    // BigUInt64

    writeBigUInt64(value) {
        if (this.bits === 8) {
            this.buf.writeBigUInt64BE(value, this.bytes);
            this.bytes += 8;
        } else {
            this.temp.writeBigUInt64BE(value);
            this.remainder = this.#copyTo(this.temp, this.buf, this.remainder, 8);
        }
        return this;
    }

    readBigUInt64() {
        if (this.bits === 8) {
            const ret = this.buf.readBigUInt64BE(this.bytes);
            this.bytes += 8;
            return ret;
        } else {
            this.remainder = this.#copyTo(this.buf, this.temp, this.remainder, 8);
            return this.temp.readBigUInt64BE(0);
        }
    }

    peakBigUInt64() {
        if (this.bits === 8) return this.buf.readBigUInt64BE(this.bytes);
        this.#peakTo(this.buf, this.temp, this.remainder, this.bits, this.bytes, 8);
        return this.temp.readBigUInt64BE(0);
    }

    // Float32

    writeFloat32(value) {
        if (this.bits === 8) {
            this.buf.writeFloatBE(value, this.bytes);
            this.bytes += 4;
        } else {
            this.temp.writeFloatBE(value);
            this.remainder = this.#copyTo(this.temp, this.buf, this.remainder, 4);
        }
        return this;
    }

    readFloat32() {
        if (this.bits === 8) {
            const ret = this.buf.readFloatBE(this.bytes);
            this.bytes += 4;
            return ret;
        } else {
            this.remainder = this.#copyTo(this.buf, this.temp, this.remainder, 4);
            return this.temp.readFloatBE(0);
        }
    }

    peakFloat32() {
        if (this.bits === 8) return this.buf.readFloatBE(this.bytes);
        this.#peakTo(this.buf, this.temp, this.remainder, this.bits, this.bytes, 4);
        return this.temp.readFloatBE(0);
    }

    // Float64

    writeFloat64(value) {
        if (this.bits === 8) {
            this.buf.writeDoubleBE(value, this.bytes);
            this.bytes += 8;
        } else {
            this.temp.writeDoubleBE(value);
            this.remainder = this.#copyTo(this.temp, this.buf, this.remainder, 8);
        }
        return this;
    }

    readFloat32() {
        if (this.bits === 8) {
            const ret = this.buf.readDoubleBE(this.bytes);
            this.bytes += 8;
            return ret;
        } else {
            this.remainder = this.#copyTo(this.buf, this.temp, this.remainder, 8);
            return this.temp.readDoubleBE(0);
        }
    }

    peakFloat32() {
        if (this.bits === 8) return this.buf.readDoubleBE(this.bytes);
        this.#peakTo(this.buf, this.temp, this.remainder, this.bits, this.bytes, 8);
        return this.temp.readDoubleBE(0);
    }

    //----------------------------

    get buffer() {
        if (this.remainder != 0) {
            this.buf.writeUInt8(this.remainder, this.bytes++);
            this.remainder = 0;
        }
        return this.buf;
    }

    // private

    #copyTo(source, destiny, remainder, numBytes, begin = 0) {
        for (let i = begin; i < numBytes; i++, this.bytes++) {
            const remaining = (8 - this.bits);
            const byte = source.readUInt8(i);
            const low = byte >> remaining;
            const high = (byte << this.bits) & 0xFF;
            destiny.writeUInt8(remainder | low, this.bytes);
            remainder = high;
            this.bits = remaining;
            if (this.bits <= 0) this.bits = 8;
        }
        return remainder;
    }

    #consumeBitsFrom(source, destiny, remainder, bits) {
        let sourceBits = bits % 8;
        let index = Math.floor(bits / 8) - 1;

        if (this.bits <= sourceBits) {
            const remaining = sourceBits - this.bits;
            const byte = source.readUInt8(index);
            destiny.writeUInt8(remainder | (byte >> remaining), this.bytes++);
            remainder = (byte << (8 - remaining)) & 0xFF;
            bits -= (sourceBits - remaining);
            sourceBits = 8 - remaining;
            this.bits -= (sourceBits - remaining);
            if (sourceBits >= 8) index--;
        } else {
            let remaining = (8-sourceBits) - (8-this.bits);
            let byte = source.readUInt8(index--);
            const high = byte << remaining;
            let low = 0;
            if (index > 0) {
                byte = source.readUInt8(index--);
                low = byte >> (8 - remaining);
            }
            destiny.writeUInt8(remainder | high | low, this.bytes++);
            remainder = (byte << remaining) & 0xFF;
            this.bits -= (sourceBits + remaining);
            bits -= (sourceBits + remaining);
            sourceBits = 8 - remaining;
        }

        if (this.bits <= 0) this.bits = 8;

        while (bits > 8 && index > 0) {
            const remaining = (8 - sourceBits);
            const byte = source.readUInt8(index);
            const low = byte >> remaining;
            const high = (byte << sourceBits) & 0xFF;
            destiny.writeUInt8(remainder | low, this.bytes++);
            remainder = high;
            sourceBits -= 8 - remaining;
            if (sourceBits <= 0) {
                sourceBits = 8;
                index--;
            }
        }
        
        return remainder;
    }

    #peakTo(source, destiny, remainder, numBytes, bits, bytes, begin = 0){
        for (let i = begin; i < numBytes; i++, bytes++) {
            const remaining = (8 - this.bits);
            const byte = source.readUInt8(bytes);
            const low = byte >> remaining;
            const high = (byte << bits) & 0xFF;
            destiny.writeUint8(remainder | low, i);
            remainder = high;
            bits = remaining;
            if (bits <= 0) bits = 8;
        }
        return remainder;
    }
}