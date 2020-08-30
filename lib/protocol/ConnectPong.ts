import Packet from './Packet.ts';
import Identifiers from './Identifiers.ts';

class ConnectedPong extends Packet {
     private _clientTimestamp!: bigint;
     private _serverTimestamp!: bigint;

     constructor() {
          super(Identifiers.ConnectedPong);
     }

     public write(): void {
          super.write();
          this.writeLong(this.clientTimestamp);
          this.writeLong(this.serverTimestamp);
     }

     public get clientTimestamp(): bigint {
          return this._clientTimestamp;
     }

     public set clientTimestamp(clientTimestamp) {
          this._clientTimestamp = clientTimestamp;
     }

     public get serverTimestamp(): bigint {
          return this._serverTimestamp;
     }

     public set serverTimestamp(serverTimestamp) {
          this._serverTimestamp = serverTimestamp;
     }
}
export default ConnectedPong;