import Packet from './Packet.ts';
import Identifiers from './Identifiers.ts';

class ConnectionRequest extends Packet {
     private _clientGUID!: bigint;
     private _requestTimestamp!: bigint;

     constructor() {
          super(Identifiers.ConnectionRequest);
     }

     // @ts-ignore
     public read(): void {
          super.read();
          this.clientGUID = this.readLong();
          this.requestTimestamp = this.readLong();
          this.readByte();  // secure
      }
  
      public write(): void {
          super.write();
          this.writeLong(this.clientGUID);
          this.writeLong(this.requestTimestamp);
          this.writeByte(0);  // secure
      }
  
      public get clientGUID(): bigint {
          return this._clientGUID;
      }
  
      public set clientGUID(clientGUID) {
          this._clientGUID = clientGUID;
      }
  
      public get requestTimestamp(): bigint {
          return this._requestTimestamp;
      }
  
      public set requestTimestamp(requestTimestamp) {
          this._requestTimestamp = requestTimestamp;
      }
}
export default ConnectionRequest;