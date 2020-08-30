import Identifiers from "./Identifiers.ts";
import OfflinePacket from "./OfflinePacket.ts";

class UnconnectedPing extends OfflinePacket {
     public sendTimestamp!: bigint;
     public serverGUID!: bigint;
     public serverName!: string;

     constructor() {
          super(Identifiers.UnconnectedPong);
     }

     public read(): void {
          super.read();
          this.sendTimestamp = this.readLong();
          this.serverGUID = this.readLong();
          this.readMagic();
          this.serverName = this.readRemaining().toString();
     }

     public write(): void {
          super.write();
          this.writeLong(this.sendTimestamp);
          this.writeLong(this.serverGUID);
          this.writeMagic();
          this.writeString(this.serverName);
     }
}
export default UnconnectedPing;