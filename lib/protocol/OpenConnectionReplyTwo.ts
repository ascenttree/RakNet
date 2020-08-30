import Identifiers from "./Identifiers.ts";
import OfflinePacket from "./OfflinePacket.ts";

class OpenConnectionReplyTwo extends OfflinePacket {
     public serverGUID!: bigint;
     public clientAddress!: Address;
     public mtuSize!: number;

     constructor() {
          super(Identifiers.OpenConnectionReply2);
     }

     // @ts-ignore
     public read(): void {
          super.read();
          this.readMagic();
          this.serverGUID = this.readLong();
          this.clientAddress = this.readAddress();
          this.mtuSize = this.readShort();
     }

     public write(): void {
          super.write();
          this.writeMagic();
          this.writeLong(this.serverGUID);
          this.writeAddress(this.clientAddress);
          this.writeShort(this.mtuSize);
          this.writeByte(0);
     }
}
export default OpenConnectionReplyTwo;