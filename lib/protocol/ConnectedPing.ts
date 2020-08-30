import Packet from './Packet.ts';
import Identifiers from './Identifiers.ts';

class ConnectedPing extends Packet {
     private _clientTimestamp!: bigint;

     constructor() {
          super(Identifiers.ConnectedPing);
     }

     // @ts-ignore
     public read(): void {
          super.read()
          this._clientTimestamp = this.readLong();
     }

     public write(): void {
          super.write();
          this.writeLong(this._clientTimestamp);
     }

     public get clientTimestamp(): bigint {
          return this._clientTimestamp;
     }

     public set clientTimestamp(clientTimestamp) {
          this._clientTimestamp = clientTimestamp;
     }

}
export default ConnectedPing;