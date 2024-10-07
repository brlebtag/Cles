export default class BitstreamReader {
    #view = null;
    #temp = null;
    #bytesRead = 0;
    #bitsRead = 0;
    #remainder = 0;
    #bitsRemaining = 0;

    constructor(view) {
        this.#view = view;
        this.#temp = view.alloc(8);
    }

    readBit() {

    }

    readBits(bits) {

    }

    skipBit() {

    }

    skipBits(bits) {

    }

    readInt8() {
        
    }

    readUInt8() {
        
    }

    readInt16() {
        
    }

    readUInt16() {
        
    }

    readInt32() {
        
    }

    readUInt32() {
        
    }

    writeBigInt64() {
        
    }

    readBigUInt64() {
        
    }

    readFloat32() {
        
    }

    readFloat64() {
        
    }
}