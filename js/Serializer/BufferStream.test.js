import BufferStream from './BufferStream.js';
import { describe, expect, it } from '@jest/globals';


describe('BufferStream', () => {
    describe('.skipBit()', () => {
        it('must skip the first bit and set the second bit in the high half of a byte', () => {
            const writer = new BufferStream(Buffer.alloc(10));
            writer.skipBit();
            writer.writeBit();
            expect(writer.buffer.readInt8(0)).toBe(64);
        });
    });

    describe('.writeBit()', () => {
        it('must set one bit in the high half of a byte', () => {
            const writer = new BufferStream(Buffer.alloc(10));
            writer.writeBit();
            expect(writer.buffer.readInt8(0)).toBe(-128);
        });
    });

    describe('.writeInt8()', () => {
        it('must copy 2 bits from the first and 6 bits from the second in the first byte and the last 2 bits in the second byte', () => {
            const writer = new BufferStream(Buffer.alloc(2));

            writer.skipBit();
            writer.writeBit();
            writer.writeInt8(85);
            expect(writer.buffer.readInt8(0)).toBe(85);
            expect(writer.buffer.readInt8(1)).toBe(64);
        });
    });

    it('must must serialize and deserialize a complex object', () => {
        const buffer = Buffer.alloc(100);
        const writer = new BufferStream(buffer);
        const reader = new BufferStream(buffer);
    });
});