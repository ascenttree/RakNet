import Listener from '../Listener.ts';
import Ack from "../protocol/Ack.ts";
import DataPacket from "../protocol/DataPacket.ts";
import NAck from "../protocol/NAck.ts";
import Packet from "../protocol/Packet.ts";
import Address from '../utils/Address.ts';
import Buffer from 'https://deno.land/std/node/buffer.ts';
import BitFlags from "../protocol/BitFlags.ts";
import EncapsulatedPacket from "../protocol/EncapsulatedPacket.ts";

enum Priority {
     Normal = 0,
     Immediate = 1
}
enum Status {
     Connecting = 0,
     Connected = 1,
     Disconnecting = 2,
     Disconnected = 3
}

class Connection {
     public listener: Listener;
     public mtuSize: bigint;
     public address: Address;
     public state = Status.Connecting;
     public nackQueue: number[] = [];
     public ackQueue: number[] = [];
     public recoveryQueue = new Map();
     public packetToSend: DataPacket[] = [];
     public sendQueueP = new DataPacket();
     
     public splitPackets = new Map();

     public windowStart: number = -1;
     public windowEnd: number = 2048;
     public reliableWindowStart: number = 0;
     public reliableWindowEnd: number = 2048;
     public reliableWindow = new Map();
     public lastReliableIndex: number = -1;

     public recievedWindow: number[] = [];
     public lastSequenceNumber: number = -1;
     public sendSequenceNumber: number = 0;
     
     public messageIndex: number = 0;
     public channelIndex: number[] = [];

     public needACK = new Map();
     public splitID: number = 0;

     public lastUpdate: number = Date.now();
     public isActive: boolean = false;

     constructor(listener: Listener, mtuSize: bigint, address: Address) {
          this.listener = listener;
          this.mtuSize = mtuSize;
          this.address = address;
          this.lastUpdate = Date.now();

          for (let i = 0; i < 32; i++) {
               this.channelIndex[i] = 0;
          }
     }

     public update(timestamp: number): void {
          if (!this.isActive && (this.lastUpdate + 10000) < timestamp) {
               this.disconnect('Timeout');
               return;
          }
          this.isActive = false;

          if (this.ackQueue.length > 0) {
               let pk = new Ack();
               pk.packets = this.ackQueue;
               this.sendPacket(pk);
               this.nackQueue = [];
          }

          if (this.nackQueue.length > 0)  {
               let pk = new NAck();
               pk.packets = this.nackQueue;
               this.sendPacket(pk);
               this.nackQueue = [];
          }

          if (this.packetToSend.length > 0) {
               let limit = 16;
               for (let pk of this.packetToSend) {
                    pk.sendTime = timestamp;
                    pk.write();
                    this.recoveryQueue.set(pk.sequenceNumber, pk);
                    let index = this.packetToSend.indexOf(pk);
                    this.packetToSend.splice(index, 1);

                    if (--limit <= 0) {
                         break;
                    }
               }

               if (this.packetToSend.length > 2048) {
                    this.packetToSend = []
               }
          }

          if (this.needACK.size > 0) {
               for (let [identifierACK, indexes] of this.needACK) {
                    if (indexes.length === 0) {
                         this.needACK.delete(identifierACK);
                    }
               }
          }

          for (let [seq, pk] of this.recoveryQueue) {
               if (pk.sendTime < (Date.now() - 8)) {
                    this.packetToSend.push(pk);
                    this.recoveryQueue.delete(seq);
               }
          }

          for (let seq of this.recievedWindow) {
               if (seq < this.windowStart) {
                    let index: number = this.recievedWindow.indexOf(seq);
                    this.recievedWindow.splice(index, 1);
               } else {
                    break;
               }
          }

          //this.sendQueue();
     }

     public disconnect(reason: string): void {

     }

     public sendPacket(pk: Packet): void {
          pk.write();
          // send to connection.
     }
}
export default Connection;