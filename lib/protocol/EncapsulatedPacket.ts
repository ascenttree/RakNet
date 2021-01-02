import BitFlags from './BitFlags.ts';
import type { Buffer } from 'https://deno.land/std@0.83.0/node/buffer.ts';
import Reliability from './Reliability.ts';
import { BinaryStream } from 'https://raw.githubusercontent.com/RaptorsMC/BinaryUtils/master/mod.ts';
import type Packet from "./Packet.ts";

class EncapsulatedPacket {
     public buffer!: Buffer;
     public reliability!: number;
     public messageIndex!: number;
     public sequenceIndex!: number;
     public orderIndex!: number;
     public orderChannel!: number;
     public split!: boolean;
     public splitCount!: number;
     public splitIndex!: number;
     public splitID!: number;
     public needACK!: boolean;
     public identifierACK!: number;

     public static fromBinary(stream: BinaryStream|Packet): EncapsulatedPacket {
          let packet: EncapsulatedPacket = new EncapsulatedPacket();
          let header: number = stream.readByte();

          packet.reliability = (header & 244) >> 5;
          packet.split = (header & BitFlags.Split) > 0;

          let length: number = stream.readShort();
          length >>= 3;

          if (length === 0) {
               throw new Error('Empty Encapsulated Packet');
          }

          if (Reliability.reliable(packet.reliability)) {
               packet.messageIndex = stream.readLTriad();
          }

          if (Reliability.sequenced(packet.reliability)) {
               packet.sequenceIndex = stream.readLTriad();
          }

          if (Reliability.sequencedOrOrdered(packet.reliability)) {
               packet.orderIndex = stream.readLTriad();
               packet.orderChannel = stream.readByte();
          }

          if (packet.split) {
               packet.splitCount = stream.readInt();
               packet.splitID = stream.readShort();
               packet.splitIndex = stream.readInt();
          }
          packet.buffer = stream.buffer.slice(stream.offset);
          stream.offset += length;
          return packet;
     }

     public toBinary(): BinaryStream {
          let stream = new BinaryStream();
          let header = this.reliability << 5;

          if (this.split) {
               header |= BitFlags.Split;
          }

          stream.writeByte(header);
          stream.writeShort(this.buffer.length << 3);

          if (Reliability.reliable(this.reliability)) {
               stream.writeLTriad(this.messageIndex);
          }

          if (Reliability.sequenced(this.reliability)) {
               stream.writeLTriad(this.sequenceIndex);
          }

          if (Reliability.sequencedOrOrdered(this.reliability)) {
               stream.writeLTriad(this.orderIndex);
               stream.writeByte(this.orderChannel);
          }

          if (this.split) {
               stream.writeInt(this.splitCount);
               stream.writeShort(this.splitID);
               stream.writeInt(this.splitIndex);
          }

          stream.append(this.buffer);
          return stream;
     }

     public getTotalLength(): number {
          return 3 + this.buffer.length + (typeof this.messageIndex !== 'undefined' ? 3 : 0) + (typeof this.orderIndex !== 'undefined' ? 4 : 0) + (this.splitIndex ? 10 : 0);
     }
}
export default EncapsulatedPacket;