import { setBit, checkBit } from './Bit.js';

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

export class BufferSerializer {
    serialize(commands, buffer, totalPacketBytes, begin = 0) {
        const len = commands.length;

        if (len <= 0) return 0;

        buffer.writeUInt32BE(len, begin); // length
        let first = commands.at(0);
        buffer.writeUInt32BE(first.frame, begin + 4); // first frame number
        buffer.writeUInt8(cmdToByte(first), begin + 8); // command
        let totalBytes = begin + 9; // len(32-bits = 4 bytes) + first's frame number (32-bits = 4 bytes) + first's command (1 byte)

        for (let i = 1; (i < len) && (totalBytes < totalPacketBytes); i++, totalBytes++) {
            buffer.writeUInt8(cmdToByte(commands.at(i)), totalBytes); // more commands
        }

        return totalBytes;
    }

    deserialize(buffer, begin = 0) {
        const size = buffer.readUInt32BE(begin); // size
        let commands = [];

        if (size > 0) {
            const firstFrame = buffer.readUInt32BE(begin + 4); // first frame number
            let firstCmd = byteToCmd(buffer.readUInt8(begin + 8)); // first command
            firstCmd.frame = firstFrame;
            let totalBytes = begin + 9;
            commands.push(firstCmd);
        
            for (let i = 1; i < size; i++, totalBytes++) {
                const cmd = byteToCmd(buffer.readUInt8(totalBytes)); // more commands
                cmd.frame = firstFrame + i;
                commands.push(cmd);
            }
        }

        return commands;
    }
}

export class TypedArraySerializer {
    serialize(commands, buffer, totalPacketBytes, begin = 0) {
        const len = commands.length;

        if (len <= 0) return 0;

        let dataView = new DataView(buffer);
        dataView.setUint32(begin, len); // length
        let first = commands.at(0);
        dataView.setUint32(begin + 4, first.frame); // first frame number
        dataView.setUint8(begin + 8, cmdToByte(first)); // command
        let totalBytes = begin + 9; // len(32-bits = 4 bytes) + first's frame number (32-bits = 4 bytes) + first's command (1 byte)

        for (let i = 1; (i < len) && (totalBytes < totalPacketBytes); i++, totalBytes++) {
            dataView.setUint8(totalBytes, cmdToByte(commands.at(i))); // more commands
        }

        return totalBytes;
    }

    deserialize(buffer, begin = 0) {
        let dataView = new DataView(buffer);
        const size = dataView.getUint32(begin); // size
        let commands = [];

        if (size > 0) {
            const firstFrame = dataView.getUint32(begin + 4); // first frame number
            let firstCmd = byteToCmd(dataView.getUint8(begin + 8)); // first command
            firstCmd.frame = firstFrame;
            let totalBytes = begin + 9;
            commands.push(firstCmd);
        
            for (let i = 1; i < size; i++, totalBytes++) {
                const cmd = byteToCmd(dataView.getUint8(totalBytes)); // more commands
                cmd.frame = firstFrame + i;
                commands.push(cmd);
            }
        }

        return commands;
    }
}
