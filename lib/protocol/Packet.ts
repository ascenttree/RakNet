import { BinaryStream } from 'https://raw.githubusercontent.com/RaptorsMC/BinaryUtils/master/mod.ts';
import Address from '../utils/Address.ts';
import { Buffer } from 'https://deno.land/std@0.83.0/node/buffer.ts';

class Packet extends BinaryStream {
     public id: number;
     public messageIndex!: number;

     constructor(id: number) {
          super();
          this.id = id;
     }

     public static get id(): number {
          return this.id;
     }

     // @ts-ignore
     public read(): void {
          this.readByte()  // Skip the packet ID
     }

     // Encodes packet buffer
     public write() {
          this.writeByte(this.id);
     }

     // Reads a string from the buffer
     public readString() {
          super.read(this.readShort());
     }

     // Writes a string length + buffer
     // valid only for offline packets
     public writeString(v: string) {
          this.writeShort(Buffer.byteLength(v));
          this.append(Buffer.from(v, 'utf-8'));
     }

     // Reads a RakNet address passed into the buffer
     public readAddress(): Address {
          let ver = this.readByte() || 6;
          if (ver == 4) {
               // Read 4 bytes
               let ipBytes = this.buffer.slice(this.offset, this.addOffset(4, true));
               let addr = `${(-ipBytes[0]-1)&0xff}.${(-ipBytes[1]-1)&0xff}.${(-ipBytes[2]-1)&0xff}.${(-ipBytes[3]-1)&0xff}`;
               let port = this.readShort();
               return new Address(addr, port, ver);
          } else {
               this.offset += 2; // Skip 2 bytes
               let port = this.readShort();
               this.offset += 4; // Skip 4 bytes
               let addr = this.buffer.slice(this.offset, this.offset += 16).toString('utf8');
               this.offset += 4;  // Skip 4 bytes
               return new Address(addr, port, ver as 6);
          }
     }

     // Writes an IPv4 address into the buffer
     // Needs to get refactored, also needs to be added support for IPv6
     public writeAddress(address: Address): void {
          this.writeByte(address.version || 4);
          address.ip.split('.', 4).forEach((b: string) => this.writeByte(-b-1));
          this.writeShort(address.port);
     }
}
export default Packet;