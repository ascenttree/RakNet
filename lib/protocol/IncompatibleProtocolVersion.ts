import Identifiers from './Identifiers.ts';
import OfflinePacket from './OfflinePacket.ts';

class IncompatibleProtocolVersion extends OfflinePacket {
     public protocol!: number;
     public serverGUID!: bigint;

     constructor() {
          super(Identifiers.IncompatibleProtocolVersion);
     }

     write() {
          super.write();
          this.writeByte(this.protocol);
          this.writeMagic();
          this.writeLong(this.serverGUID);
     }
}

export default IncompatibleProtocolVersion;