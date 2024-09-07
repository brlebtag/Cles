import { setBit, checkBit } from './Bit.js';
import { CMD_END_OF_BUFFER } from './CommandTypes.js';

function cmdToByte(cmd) {
    let value = 0;

    if (cmd.left) {
        value = setBit(value, 0);
    }

    if (cmd.right) {
        value = setBit(value, 1);
    }

    if (cmd.up) {
        value = setBit(value, 2);
    }

    if (cmd.down) {
        value = setBit(value, 3);
    }

    if (cmd.shift) {
        value = setBit(value, 4);
    }

    if (cmd.space) {
        value = setBit(value, 5);
    }

    if (cmd.jump) {
        value = setBit(value, 6);
    }

    return value;
}

function byteToCmd(value) {
    return {
        left: checkBit(value, 0),
        right: checkBit(value, 1),
        up: checkBit(value, 2),
        down: checkBit(value, 3),
        shift: checkBit(value, 4),
        space: checkBit(value, 5),
        jump: checkBit(value, 6),
    };
}

export class CommandSerializer {
    constructor(serializer) {
        this.serializer = serializer;
    }

    reset() {
        this.serializer.reset();
    }

    get buffer() {
        return this.serializer.buffer;
    }

    serialize(commands, total = commands.length) {
        const serializer = this.serializer;
        const len1 = Math.min(commands.length, total);
        const len2 = serializer.length;

        if (len1 <= 0){
            serializer.writeUInt8(CMD_END_OF_BUFFER);
            return 0;
        } 

        serializer.writeUInt32(len1);  // length
        let first = commands.at(0);
        serializer.writeUInt32(first.frame);  // first frame number
        serializer.writeUInt8(cmdToByte(first)); // command

        for (let i = 1; (i < len1) && (serializer.bytes < len2); i++) {
            serializer.writeUInt8(cmdToByte(commands.at(i))); // more commands
        }

        let written = serializer.bytes;

        if (serializer.bytes < len2) {
            serializer.writeUInt8(CMD_END_OF_BUFFER);
        }

        return written;
    }

    deserialize() {
        const serializer = this.serializer;
        const length = serializer.readUInt32(); // length
        let commands = [];

        if (length > 0) {
            const firstFrame = serializer.readUInt32(); // first frame number
            let firstCmd = byteToCmd(serializer.readUInt8()); // first command
            firstCmd.frame = firstFrame;
            commands.push(firstCmd);
        
            for (let i = 1; i < length; i++) {
                const cmd = byteToCmd(serializer.readUInt8()); // more commands
                cmd.frame = firstFrame + i;
                commands.push(cmd);
            }
        }

        return commands;
    }
}


export class BufferSerializer {
    constructor(buf) {
        this.bytes = 0;
        this.buffer = buf;
        this.length = buf.length;
    }

    reset() {
        this.bytes = 0;
    }

    isEndOfBuffer() {
        return this.bytes >= this.length;
    }
    
    writeString(str) {
        this.buffer.writeUInt32BE(str.length, this.bytes);
        this.bytes += 4;
        let len = str.length;
        for(let i = 0; i < len; i++) {
            this.buffer.writeInt8(str.charCodeAt(i), this.bytes++);
        }
    }

    readString() {
        const len = this.readUInt32();
        const buffer = this.buffer;
        let str = '';
        for(let i = 0; i < len; i++) {
            str += String.fromCharCode(buffer.readInt8(this.bytes++));
        }
        return str;
    }

    peakString() {
        const len = this.peakUInt32();
        const buffer = this.buffer;
        let bytes = this.bytes + 4;
        let str = '';
        for(let i = 0; i < len; i++) {
            str += String.fromCharCode(buffer.readInt8(bytes++));
        }
        return str;
    }

    /* 8 */

    writeInt8(value) {
        this.buffer.writeInt8(value, this.bytes++);
    }

    readInt8() {
        const val = this.buffer.readInt8(this.bytes++);
        return val;
    }
    
    peakInt8() {
        return this.buffer.readInt8(this.bytes);
    }

    writeUInt8(value) {
        this.buffer.writeUInt8(value, this.bytes++);
    }

    readUInt8() {
        const val = this.buffer.readUInt8(this.bytes++);
        return val;
    }

    peakUInt8() {
        return this.buffer.readUInt8(this.bytes);
    }

    /* 16 */

    writeInt16(value) {
        this.buffer.writeInt16BE(value, this.bytes);
        this.bytes += 2;
    }

    readInt16() {
        let val = this.buffer.readInt16BE(this.bytes);
        this.bytes += 2;
        return val;
    }

    peakInt16() {
        return this.buffer.readInt16BE(this.bytes);
    }

    writeUInt16(value) {
        this.buffer.writeUInt16BE(value, this.bytes);
        this.bytes += 2;
    }

    readUInt16() {
        let val = this.buffer.readUInt16BE(this.bytes);
        this.bytes += 2;
        return val;
    }

    peakUInt16() {
        return this.buffer.readUInt16BE(this.bytes);
    }

    /* 32 */

    writeInt32(value) {
        this.buffer.writeInt32BE(value, this.bytes);
        this.bytes += 4;
    }

    readInt32() {
        let val = this.buffer.readInt32BE(this.bytes);
        this.bytes += 4;
        return val;
    }

    peakInt32() {
        return this.buffer.readInt32BE(this.bytes);
    }

    writeUInt32(value) {
        this.buffer.writeUInt32BE(value, this.bytes);
        this.bytes += 4;
    }

    readUInt32() {
        let val = this.buffer.readUInt32BE(this.bytes);
        this.bytes += 4;
        return val;
    }

    peakUInt32() {
        return this.buffer.readUInt32BE(this.bytes);
    }

    /* 64 */

    writeInt64(value) {
        this.buffer.writeInt64BE(value, this.bytes);
        this.bytes += 8;
    }

    readInt64() {
        let val = this.buffer.readInt64BE(this.bytes);
        this.bytes += 8;
        return val;
    }

    peakInt64() {
        return this.buffer.readInt64BE(this.bytes);
    }

    writeUInt64(value) {
        this.buffer.writeBigUInt64BE(value, this.bytes);
        this.bytes += 8;
    }

    readUInt64() {
        let val = this.buffer.readBigUInt64BE(this.bytes);
        this.bytes += 8;
        return val;
    }

    peakUInt64() {
        return this.buffer.readBigUInt64BE(this.bytes);
    }

    /* 32 */
    writeFloat32(value) {
        this.buffer.writeFloatBE(value, this.bytes);
        this.bytes += 4;
    }

    readFloat32() {
        let val = this.buffer.readFloatBE(this.bytes);
        this.bytes += 4;
        return val;
    }

    peakFloat32() {
        return this.buffer.readFloatBE(this.bytes);
    }

    /* 64 */
    writeFloat64(value) {
        this.buffer.writeDoubleBE(value, this.bytes);
        this.bytes += 8;
    }

    readFloat64() {
        let val = this.buffer.readDoubleBE(this.bytes);
        this.bytes += 8;
        return val;
    }

    peakFloat64() {
        return this.buffer.readDoubleBE(this.bytes);
    }
}

export class ArrayBufferSerializer {
    constructor(buf) {
        this.bytes = 0;
        this.buffer = new DataView(buf);
        this.length = this.buffer.byteLength;
    }

    isEndOfBuffer() {
        return this.bytes >= this.length;
    }

    reset() {
        this.bytes = 0;
    }
    
    writeString(str) {
        this.buffer.setUint32(this.bytes, str.length);
        this.bytes += 4;
        let len = str.length;
        for (let i = 0; i < len; i++) {
            this.buffer.setUint8(this.bytes++, str.charCodeAt(i));
        }
    }

    readString() {
        const len = this.readUInt32();
        const buffer = this.buffer;
        let str = '';
        for (let i = 0; i < len; i++) {
            str += String.fromCharCode(buffer.getUint8(this.bytes++));
        }
        return str;
    }

    peakString() {
        const len = this.peakUInt32();
        const buffer = this.buffer;
        let bytes = this.bytes + 4;
        let str = '';
        for (let i = 0; i < len; i++) {
            str += String.fromCharCode(buffer.getUint8(bytes++));
        }
        return str;
    }

    /* 8 */

    writeInt8(value) {
        this.buffer.setInt8(this.bytes++, value); // corrigi ordem!
    }

    readInt8() {
        const val = this.buffer.getInt8(this.bytes++);
        return val;
    }

    peakInt8() {
        return this.buffer.getInt8(this.bytes);
    }

    writeUInt8(value) {
        this.buffer.setUint8(this.bytes++, value);
    }

    readUInt8() {
        const val = this.buffer.getUint8(this.bytes++);
        return val;
    }

    peakUInt8() {
        return this.buffer.getUint8(this.bytes);
    }

    /* 16 */

    writeInt16(value) {
        this.buffer.setInt16(this.bytes, value);
        this.bytes += 2;
    }

    readInt16() {
        let val = this.buffer.getInt16(this.bytes);
        this.bytes += 2;
        return val;
    }

    peakInt16() {
        return this.buffer.getInt16(this.bytes);
    }

    writeUInt16(value) {
        this.buffer.setUint16(this.bytes, value);
        this.bytes += 2;
    }

    readUInt16() {
        let val = this.buffer.getUint16(this.bytes);
        this.bytes += 2;
        return val;
    }

    peakUInt16() {
        return this.buffer.getUint16(this.bytes);
    }

    /* 32 */

    writeInt32(value) {
        this.buffer.setInt32(this.bytes, value);
        this.bytes += 4;
    }

    readInt32() {
        let val = this.buffer.getInt32(this.bytes);
        this.bytes += 4;
        return val;
    }

    peakInt32() {
        return this.buffer.getInt32(this.bytes);
    }

    writeUInt32(value) {
        this.buffer.setUint32(this.bytes, value);
        this.bytes += 4;
    }

    readUInt32() {
        let val = this.buffer.getUint32(this.bytes);
        this.bytes += 4;
        return val;
    }

    peakUInt32() {
        return this.buffer.getUint32(this.bytes);
    }

    /* 64 */

    writeInt64(value) {
        this.buffer.setBigInt64(this.bytes, value);
        this.bytes += 8;
    }

    readInt64() {
        let val = this.buffer.getBigInt64(this.bytes);
        this.bytes += 8;
        return val;
    }

    peakInt64() {
        return this.buffer.getBigInt64(this.bytes);
    }

    writeUInt64(value) {
        this.buffer.setBigUint64(this.bytes, value);
        this.bytes += 8;
    }

    readUInt64() {
        let val = this.buffer.getBigUint64(this.bytes);
        this.bytes += 8;
        return val;
    }

    peakUInt64() {
        return this.buffer.getBigUint64(this.bytes);
    }

    /* 32 */
    writeFloat32(value) {
        this.buffer.setFloat32(this.bytes, value);
        this.bytes += 4;
    }

    readFloat32() {
        let val = this.buffer.getFloat32(this.bytes);
        this.bytes += 4;
        return val;
    }

    peakFloat32() {
        return this.buffer.getFloat32(this.bytes);
    }

    /* 64 */
    writeFloat64(value) {
        this.buffer.setFloat64(this.bytes, value);
        this.bytes += 8;
    }

    readFloat64() {
        let val = this.buffer.getFloat64(this.bytes);
        this.bytes += 8;
        return val;
    }

    peakFloat64() {
        return this.buffer.getFloat64(this.bytes);
    }
}

export class Allocator {
    constructor() {
        this.bytes = 0;
    }

    get length() {
        return this.bytes;
    }

    string(str) {
        this.bytes += 4 + str.length;
        return this;
    }
    
    int8() {
        this.bytes++;
        return this;
    }
    
    uint8() {
        this.bytes++;
        return this;
    }

    int16() {
        this.bytes += 2;
        return this;
    }

    uint16() {
        this.bytes += 2;
        return this;
    }

    int32() {
        this.bytes += 4;
        return this;
    }

    uint32() {
        this.bytes += 4;
        return this;
    }

    int64(value) {
        this.bytes += 8;
        return this;
    }

    uint64() {
        this.bytes += 8;
        return this;
    }

    float32() {
        this.bytes += 4;
        return this;
    }

    float64() {
        this.bytes += 8;
        return this;
    }
}


export class PacketBuilder {
    constructor(serializerMaker) {
        this.alloc = new Allocator();
        this.serializerMaker = serializerMaker;
        this.data = [];
    }

    get buffer() {
        const data = this.data;
        const serializer = this.serializerMaker(this.alloc.length);

        for (const [code, value] of data) {
            switch(code) {
                case 1:
                    serializer.writeString(value);
                    break;
                case 2:
                    serializer.writeInt8(value);
                    break;
                case 3:
                    serializer.writeUInt8(value);
                    break;
                case 4:
                    serializer.writeInt16(value);
                    break;
                case 5:
                    serializer.writeUInt16(value);
                    break;
                case 6:
                    serializer.writeInt32(value);
                    break;
                case 7:
                    serializer.writeUInt32(value);
                    break;
                case 8:
                    serializer.writeInt64(value);
                    break;
                case 9:
                    serializer.writeUInt64(value);
                    break;
                case 10:
                    serializer.writeFloat32(value);
                    break;
                case 11:
                    serializer.writeFloat64(value);
                    break;
            }
        }

        return serializer.buffer;
    }
    
    writeString(str) {
        this.alloc.string(str);
        this.data.push([1, str]);
    }

    writeInt8(value) {
        this.alloc.int8();
        this.data.push([2, value]);
    }

    writeUInt8(value) {
        this.alloc.uint8();
        this.data.push([3, value]);
    }

    writeInt16(value) {
        this.alloc.int16();
        this.data.push([4, value]);
    }

    writeUInt16(value) {
        this.alloc.uint16();
        this.data.push([5, value]);
    }

    writeInt32(value) {
        this.alloc.int32();
        this.data.push([6, value]);
    }

    writeUInt32(value) {
        this.alloc.uint32();
        this.data.push([7, value]);
    }

    writeInt64(value) {
        this.alloc.int64();
        this.data.push([8, value]);
    }

    writeUInt64(value) {
        this.alloc.uint64();
        this.data.push([9, value]);
    }

    writeFloat32(value) {
        this.alloc.float32();
        this.data.push([10, value]);
    }

    writeFloat64(value) {
        this.alloc.float64();
        this.data.push([11, value]);
    }
}

PacketBuilder.BufferAllocator = (bytes) => new BufferSerializer(Buffer.alloc(bytes));
PacketBuilder.ArrayBufferAllocator = (bytes) => new ArrayBufferSerializer(new ArrayBuffer(bytes));