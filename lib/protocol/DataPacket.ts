import BitFlags from './BitFlags.ts';
import Packet from './Packet.ts';
import EncapsulatedPacket from "./EncapsulatedPacket.ts";
import type { BinaryStream } from "https://raw.githubusercontent.com/RaptorsMC/BinaryUtils/master/mod.ts";

class DataPacket extends Packet {
     public packets: (EncapsulatedPacket|BinaryStream)[];
     public sequenceNumber!: number;
     public sendTime!: number;

     constructor() {
          super(BitFlags.Valid | 0);
          this.packets = [];
     }

     public read(): void {
          super.read();
          this.sequenceNumber = this.readLTriad();
          while (!this.feof()) {
               this.packets.push(EncapsulatedPacket.fromBinary(this));
          }
          //console.log(this.packets);
     }

     public write(): void {
          super.write();
          this.writeLTriad(this.sequenceNumber);
          for (let packet of this.packets) {
               this.append(
                    (packet instanceof EncapsulatedPacket) ? packet.toBinary().buffer : (packet as unknown as BinaryStream).buffer
               );
          }
     }

     public length(): number {
          let length: number = 4;
          for (let packet of this.packets) {
               length += packet instanceof EncapsulatedPacket ? packet.getTotalLength() : (packet as unknown as BinaryStream).buffer.length;
          }
          return length;
     }
}
export default DataPacket;