import { describe, expect, it } from '@jest/globals';
import BufferContainer from './BufferContainer.js';


describe('BufferContainer', () => {
    describe('.length', () => {
        it('returns underline array length', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            expect(view.length).toBe(32);
        });
    });

    describe('.writeUInt8()', () => {
        it('writes a byte at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeUInt8(1, 0xFF);
            expect(view.readUInt8(1)).toBe(0xFF);
        });
    });

    describe('.writeInt8()', () => {
        it('writes a positive integer (byte) at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeInt8(1, 30);
            expect(view.readUInt8(1)).toBe(30);
        });

        it('writes a negative integer (byte) at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeInt8(1, -30);
            expect(view.readInt8(1)).toBe(-30);
        });
    });

    describe('.writeUInt16()', () => {
        it('writes 2 bytes at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeUInt16(1, 0xF0F0);
            expect(view.readUInt16(1)).toBe(0xF0F0);
            expect(view.readUInt8(1)).toBe(0xF0);
            expect(view.readUInt8(2)).toBe(0xF0);
        });
    });

    describe('.writeInt16()', () => {
        it('writes positive integer (2 bytes) at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeInt16(1, 32000);
            expect(view.readInt16(1)).toBe(32000);
        });

        it('writes negative integer (2 bytes) at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeInt16(1, -32000);
            expect(view.readInt16(1)).toBe(-32000);
        });
    });

    describe('.writeUInt32()', () => {
        it('writes 4 bytes at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeUInt32(1, 0xF0F0F0F0);
            expect(view.readUInt32(1)).toBe(0xF0F0F0F0);
            expect(view.readUInt16(1)).toBe(0xF0F0);
            expect(view.readUInt16(3)).toBe(0xF0F0);
        });
    });

    describe('.writeInt32()', () => {
        it('writes positive integer (4 bytes) at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeInt32(1, 2000000000);
            expect(view.readUInt32(1)).toBe(2000000000);
        });

        it('writes negative integer (4 bytes) at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeInt32(1, -2000000000);
            expect(view.readInt32(1)).toBe(-2000000000);
        });
    });

    describe('.writeBigUInt64()', () => {
        it('writes 8 bytes at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));

            view.writeBigUInt64(1, BigInt('0xF0F0F0F0F0F0F0F0'));
            expect(view.readBigUInt64(1)).toBe(BigInt('0xF0F0F0F0F0F0F0F0'));
            expect(view.readUInt32(1)).toBe(0xF0F0F0F0);
            expect(view.readUInt32(5)).toBe(0xF0F0F0F0);


            view.writeBigUInt64(1, 0xF0F0F0F0F0F0F0FFn);
            expect(view.readBigUInt64(1)).toBe(0xF0F0F0F0F0F0F0FFn);
            expect(view.readUInt32(1)).toBe(0xF0F0F0F0);
            expect(view.readUInt32(5)).toBe(0xF0F0F0FF);
            
        });
    });

    describe('.writeBigInt64()', () => {
        it('writes positive integer (8 bytes) at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeBigInt64(1, 9000000000000000000n);
            expect(view.readBigInt64(1)).toBe(9000000000000000000n);
        });
        
        it('writes negative integer (8 bytes) at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeBigInt64(1, -9000000000000000000n);
            expect(view.readBigInt64(1)).toBe(-9000000000000000000n);
        });
    });

    describe('.writeFloat32()', () => {
        it('writes positive float (4 bytes) at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeFloat32(1, 101010.101010);
            expect(view.readFloat32(1)).toBeCloseTo(101010.101010);
        });
        
        it('writes negative float (4 bytes) at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeFloat32(1, -101010.101010);
            expect(view.readFloat32(1)).toBeCloseTo(-101010.101010);
        });
    });

    describe('.writeFloat64()', () => {
        it('writes positive float (8 bytes) at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeFloat64(1, 101010.101010);
            expect(view.readFloat64(1)).toBeCloseTo(101010.101010);
        });
        
        it('writes negative float (8 bytes) at index 1', () => {
            const view = new BufferContainer(Buffer.alloc(32));
            view.writeFloat64(1, -101010.101010);
            expect(view.readFloat64(1)).toBeCloseTo(-101010.101010);
        });
    });
});