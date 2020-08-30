import Identifiers from "./Identifiers.ts";
import OfflinePacket from "./OfflinePacket.ts";

class OpenConnectionReplyOne extends OfflinePacket {
     public serverGUID!: bigint;
     public mtuSize!: number;

     constructor() {
          super(Identifiers.OpenConnectionReply1);
     }

     // @ts-ignore
     public read(): void {
          super.read();
          this.readMagic();
          this.serverGUID = this.readLong();
          this.readByte();
          this.mtuSize = this.readShort();
     }

     public write(): void {
          super.write();
          this.writeMagic();
          this.writeLong(this.serverGUID);
          this.writeByte(0);
          this.writeShort(this.mtuSize);
     }
}
export default OpenConnectionReplyOne;