export default class BitstreamWriter {
    #view = null;
    #temp = null;
    #bytesWritten = 0;
    #bitsWritten = 0;
    #remainder = 0;

    constructor(view) {
        this.#view = view;
        this.#temp = view.alloc(8);
    }

    writeBit() {
        this.#remainder = this.#remainder | 1 << (this.#bitsWritten - 1);
        this.#bitsWritten--;

        if (this.#bitsWritten === 0) {
            this.#bitsWritten = 8;
            this.#view.writeUInt8(this.#remainder, this.#bytesWritten++);
            this.#remainder = 0x0;
        }
    }

    writeBits(bits) {

    }

    skipBit() {
        this.#bitsWritten--;
        if (this.#bitsWritten === 0) {
            this.#bitsWritten = 8;
        }
    }

    skipBits(bits) {
        this.#bytesWritten -= Math.floor(bits / 8);
        this.#bitsWritten = (bits + this.#bitsWritten) % 8;
        if (this.#bitsWritten === 0) {
            this.#bitsWritten = 8;
        }
    }

    writeInt8() {
        
    }

    writeUInt8() {
        
    }

    writeInt16() {
        
    }

    writeUInt16() {
        
    }

    writeInt32() {
        
    }

    writeUInt32() {
        
    }

    writeBigInt64() {
        
    }

    writeBigUInt64() {
        
    }

    writeFloat32() {
        
    }

    writeFloat64() {
        
    }

    #copyTo(source, destiny, remainder, numBytes, begin = 0) {
        for (let i = begin; i < numBytes; i++, this.#bytesWritten++) {
            const remaining = (8 - this.#bitsWritten);
            const byte = source.readUInt8(i);
            const low = byte >> remaining;
            const high = (byte << this.#bitsWritten) & 0xFF;
            destiny.writeUInt8(remainder | low, this.#bytesWritten);
            remainder = high;
            this.#bitsWritten = remaining;
            if (this.#bitsWritten <= 0) this.#bitsWritten = 8;
        }
        return remainder;
    }
}