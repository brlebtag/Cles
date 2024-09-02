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

    serialize(commands, total = commands.length) {
        const len1 = Math.min(commands.length, total);
        const len2 = serializer.length;
        const serializer = this.serializer;

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
        this.length = buf.size;
    }

    reset() {
        this.bytes = 0;
    }

    isEndOfBuffer() {
        return this.bytes > this.length;
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
        return this.buffer.readInt8(this.bytes++);
    }
    
    peakInt8() {
        return this.buffer.readInt8(this.bytes);
    }

    writeUInt8(value) {
        this.buffer.writeUInt8(value, this.bytes++);
    }

    readUInt8() {
        return this.buffer.readUInt8(this.bytes++);
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

export class TypedArraySerializer {
    constructor(buf) {
        this.bytes = 0;
        this.buffer = new DataView(buf);
        this.length = buf.length;
    }

    isEndOfBuffer() {
        return this.bytes > this.length;
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
        return this.buffer.getInt8(this.bytes++);
    }

    peakInt8() {
        return this.buffer.getInt8(this.bytes);
    }

    writeUInt8() {
        this.buffer.setUint8(this.bytes++, value);
    }

    readUInt8() {
        return this.buffer.getUint8(this.bytes++);
    }

    peakUInt8() {
        return this.buffer.getUint8(this.bytes);
    }

    /* 16 */

    writeInt16() {
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

    writeUInt16() {
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

    writeInt32() {
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

    writeUInt32() {
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

    writeInt64() {
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

    writeUInt64() {
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
    writeFloat32() {
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
    writeFloat64() {
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