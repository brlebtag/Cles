import BufferSerializer from "./js/Serializer/BufferSerializer.js";

const serializer = new BufferSerializer(Buffer.alloc(2));

serializer.skipBit();
serializer.writeBit();
serializer.writeInt8(85);

const buffer = serializer.buffer;

console.log(buffer.readUInt8(0), buffer.readUInt8(1));