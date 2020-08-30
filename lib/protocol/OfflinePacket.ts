import Packet from './Packet.ts';
import Buffer from 'https://deno.land/std/node/buffer.ts';

const MAGIC: string = '\x00\xff\xff\x00\xfe\xfe\xfe\xfe\xfd\xfd\xfd\xfd\x12\x34\x56\x78';
class OfflinePacket extends Packet {
     private magic!: Buffer;

     public readMagic(): void {
          this.magic = this.buffer.slice(this.offset, this.addOffset(16, true));
     }

     public writeMagic(): void {
          this.append(Buffer.from(MAGIC, 'binary'));
     }

     get valid(): boolean {
          return true;
     }
}
export default OfflinePacket;