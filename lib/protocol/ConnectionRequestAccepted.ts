import Packet from './Packet.ts';
import Identifiers from './Identifiers.ts';
import Address from '../utils/Address.ts';

class ConnectionRequestAccepted extends Packet {
     private _clientAddress!: Address;
     private _requestTimestamp!: bigint;
     private _acceptedTimestamp!: bigint;

     constructor() {
          super(Identifiers.ConnectionRequestAccepted);
     }

     // @ts-ignore
     public read() {
          super.read();
          this._clientAddress = this.readAddress();
          this.readShort();  // unknown
          for (let i = 0; i < 20; i++) {
              this.readAddress();
          }
          this._requestTimestamp = this.readLong();
          this._acceptedTimestamp = this.readLong();
      }
  
      public write() {
          super.write();
          this.writeAddress(this._clientAddress);
          this.writeShort(0);  // unknown
          let sysAddresses = [new Address('127.0.0.1', 0, 4)];
          for (let i = 0; i < 20; i++) {
              this.writeAddress(sysAddresses[i] || new Address('0.0.0.0', 0, 4));
          }
          this.writeLong(this._requestTimestamp);
          this.writeLong(this._acceptedTimestamp);
      }
  
      public get clientAddress() {
          return this._clientAddress;
      }
  
      public set clientAddress(clientAddress: Address) {
          this._clientAddress = clientAddress;
      }
  
      public get requestTimestamp() {
          return this._requestTimestamp;
      }
  
      public set requestTimestamp(requestTimestamp: bigint) {
          this._requestTimestamp = requestTimestamp;
      }
  
      public get accpetedTimestamp() {
          return this._acceptedTimestamp;
      }
  
      public set accpetedTimestamp(acceptedTimestamp: bigint) {
          this._acceptedTimestamp = acceptedTimestamp;
      }
}
export default ConnectionRequestAccepted;