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

    serialize(commands, offset = 0, total = commands.length) {
        const serializer = this.serializer;
        let size = Math.min(Math.min(commands.length, total), serializer.length - 9 /* size + first.frame + CMD_END_OF_BUFFER */);

        if (size <= 0) return 0;

        let copySize = size;

        serializer.writeUInt32(size);  // size
        let first = commands.at(offset);
        serializer.writeUInt32(first.frame);  // first frame's number
        console.log(`frame sent: ${first.frame}`);
        serializer.writeUInt8(cmdToByte(first)); // command

        let written = 10; /* length + first.frame + first + CMD_END_OF_BUFFER */

        for (let i = (offset + 1); size > 0; size--, i++, written++) {
            const cmd = commands.at(i);
            serializer.writeUInt8(cmdToByte(cmd)); // more commands
            console.log(`frame sent: ${cmd.frame}`);
        }

        serializer.writeUInt8(CMD_END_OF_BUFFER);
        written++

        console.assert(written === copySize);

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
        return this;
    }

    offset(bytes) {
        this.bytes = bytes;
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
    }
    
    offset(bytes) {
        this.bytes = bytes;
        return this;
    }
    
    writeString(str) {
        this.buffer.setUint32(this.bytes, str.length);
        this.bytes += 4;
        let len = str.length;
        for (let i = 0; i < len; i++) {
            this.buffer.setUint8(this.bytes++, str.charCodeAt(i));
        }
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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
        return this;
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

    reset() {
        this.bytes = 0;
        return this;
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

    int64() {
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


export class DynamicPacketBuilder {
    constructor(serializerMaker) {
        this.alloc = new Allocator();
        this.serializerMaker = serializerMaker;
        this.data = [];
    }

    get length() {
        return this.alloc.length;
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
        return this;
    }

    writeInt8(value) {
        this.alloc.int8();
        this.data.push([2, value]);
        return this;
    }

    writeUInt8(value) {
        this.alloc.uint8();
        this.data.push([3, value]);
        return this;
    }

    writeInt16(value) {
        this.alloc.int16();
        this.data.push([4, value]);
        return this;
    }

    writeUInt16(value) {
        this.alloc.uint16();
        this.data.push([5, value]);
        return this;
    }

    writeInt32(value) {
        this.alloc.int32();
        this.data.push([6, value]);
        return this;
    }

    writeUInt32(value) {
        this.alloc.uint32();
        this.data.push([7, value]);
        return this;
    }

    writeInt64(value) {
        this.alloc.int64();
        this.data.push([8, value]);
        return this;
    }

    writeUInt64(value) {
        this.alloc.uint64();
        this.data.push([9, value]);
        return this;
    }

    writeFloat32(value) {
        this.alloc.float32();
        this.data.push([10, value]);
        return this;
    }

    writeFloat64(value) {
        this.alloc.float64();
        this.data.push([11, value]);
        return this;
    }

    writeList(arrayLike, cb, begin, total) {
        const arrLen = arrayLike.length;
        console.assert(total <= arrLen);
        console.assert(begin >= 0 && begin <= total && (arrLen - begin) === total);

        this.writeUInt32(total);

        if (arrLen === 0 || total === 0 || begin >= total) return this;

        cb.call(this, arrayLike.at(begin), 0);

        for (let i = begin + 1, j = 1; i < arrLen; i++, j++) {
            cb.call(this, arrayLike.at(i), j);
        }

        return this;
    }
}

DynamicPacketBuilder.BufferAllocator = (bytes) => new BufferSerializer(Buffer.alloc(bytes));
DynamicPacketBuilder.ArrayBufferAllocator = (bytes) => new ArrayBufferSerializer(new ArrayBuffer(bytes));

export class StaticPacketBuilder {
    constructor(serializer) {
        this.alloc = new Alloator();
        this.serializer = serializer;
        this.data = [];
        this.bufferSizeOffset = -1;
    }

    get length() {
        return this.serializer.length;
    }

    get written() {
        return this.alloc.length;
    }

    get buffer() {
        const serializer = this.serializer;
        const alloc = this.alloc;
        const data = this.data;

        serializer.reset();
        alloc.reset();

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

        if (alloc.length < serializer.length) {
            alloc.uint8();
            serializer.writeUInt8(CMD_END_OF_BUFFER);
        }

        return alloc.length;
    }
    
    writeString(str) {
        this.alloc.string(str);
        const overfloat = this.alloc.length > this.serializer.length;
        if (overfloat) throw 'Buffer was overflown';
        this.data.push([1, str]);
        return this;
    }

    writeInt8(value) {
        this.alloc.int8();
        const overfloat = this.alloc.length > this.serializer.length;
        if (overfloat) throw 'Buffer was overflown';
        this.data.push([2, value]);
        return this;
    }

    writeUInt8(value) {
        this.alloc.uint8();
        const overfloat = this.alloc.length > this.serializer.length;
        if (overfloat) throw 'Buffer was overflown';
        this.data.push([3, value]);
        return this;
    }

    writeInt16(value) {
        this.alloc.int16();
        const overfloat = this.alloc.length > this.serializer.length;
        if (overfloat) throw 'Buffer was overflown';
        this.data.push([4, value]);
        return this;
    }

    writeUInt16(value) {
        this.alloc.uint16();
        const overfloat = this.alloc.length > this.serializer.length;
        if (overfloat) throw 'Buffer was overflown';
        this.data.push([5, value]);
        return this;
    }

    writeInt32(value) {
        this.alloc.int32();
        const overfloat = this.alloc.length > this.serializer.length;
        if (overfloat) throw 'Buffer was overflown';
        this.data.push([6, value]);
        return this;
    }

    writeUInt32(value) {
        this.alloc.uint32();
        const overfloat = this.alloc.length > this.serializer.length;
        if (overfloat) throw 'Buffer was overflown';
        this.data.push([7, value]);
        return this;
    }

    writeInt64(value) {
        this.alloc.int64();
        const overfloat = this.alloc.length > this.serializer.length;
        if (overfloat) throw 'Buffer was overflown';
        this.data.push([8, value]);
        return this;
    }

    writeUInt64(value) {
        this.alloc.uint64();
        const overfloat = this.alloc.length > this.serializer.length;
        if (overfloat) throw 'Buffer was overflown';
        this.data.push([9, value]);
        return this;
    }

    writeFloat32(value) {
        this.alloc.float32();
        const overfloat = this.alloc.length > this.serializer.length;
        if (overfloat) throw 'Buffer was overflown';
        this.data.push([10, value]);
        return this;
    }

    writeFloat64(value) {
        this.alloc.float64();
        const overfloat = this.alloc.length > this.serializer.length;
        if (overfloat) throw 'Buffer was overflown';
        this.data.push([11, value]);
        return this;
    }

    writeList(arrayLike, cb, begin, total) {
        const arrLen = arrayLike.length;
        console.assert(total <= arrLen);
        console.assert(begin >= 0 && begin < total);
        let bufferLen = this.serializer.length;
        let prevBufAlloc = this.alloc.length;
        const sizeIndex = this.data.length;

        this.writeUInt32(0);

        if (arrLen === 0 || total === 0 || begin >= total) return this;

        cb.call(this, arrayLike.at(begin), 0);

        let curBufAlloc, curAlloc;
        curBufAlloc = curAlloc = this.alloc.length;
        const packetSize = curBufAlloc - prevBufAlloc;

        if (curAlloc > bufferLen) throw 'Buffer was overflown';

        curAlloc += packetSize;
        prevBufAlloc = curBufAlloc;
        let j = 1;

        for (let i = begin + 1; i < arrLen && curAlloc <= bufferLen; i++, j++, curAlloc += packetSize) {
            cb.call(this, arrayLike.at(i), j);
            curBufAlloc = this.alloc.length;
            if ((curBufAlloc - prevBufAlloc) != packetSize)
                throw 'can\'t have varying size!';
            prevBufAlloc = curBufAlloc;
        }

        this.data[sizeIndex][1] = j; // number of elements actually written!

        return this;
    }
}