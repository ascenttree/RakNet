import type Listener from '../Listener.ts';
import Ack from "../protocol/Ack.ts";
import DataPacket from "../protocol/DataPacket.ts";
import NAck from "../protocol/NAck.ts";
import type Packet from "../protocol/Packet.ts";
import type Address from '../utils/Address.ts';
import Buffer from 'https://deno.land/std/node/buffer.ts';
import BitFlags from "../protocol/BitFlags.ts";
import EncapsulatedPacket from "../protocol/EncapsulatedPacket.ts";
import Collection from "../utils/Collection.ts";
import { BinaryStream } from "https://raw.githubusercontent.com/RaptorsMC/BinaryUtils/master/mod.ts";
import Identifiers from "../protocol/Identifiers.ts";
import ConnectionRequest from "../protocol/ConnectionRequest.ts";
import type OfflinePacket from "../protocol/OfflinePacket.ts";
import ConnectionRequestAccepted from "../protocol/ConnectionRequestAccepted.ts";
import NewIncomingConnection from "../protocol/NewIncomingConnection.ts";
import ConnectedPing from '../protocol/ConnectedPing.ts';
import ConnectedPong from '../protocol/ConnectedPong.ts';
import Reliability from "../protocol/Reliability.ts";
import { convertBinaryStringToUint8Array } from "../utils/Utilities.ts";

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
     public mtuSize: number;
     public address: Address;
     public state = Status.Connecting;
     public nackQueue: number[] = [];
     public ackQueue: number[] = [];
     public recoveryQueue: Map<number, DataPacket> = new Map();
     public packetToSend: DataPacket[] = [];
     public sendQueueP = new DataPacket();
     
     public splitPackets = new Map();

     public windowStart: number = -1;
     public windowEnd: number = 2048;
     public reliableWindowStart: number = 0;
     public reliableWindowEnd: number = 2048;
     public reliableWindow: Collection<number, Packet|EncapsulatedPacket> = new Collection();
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

     constructor(listener: Listener, mtuSize: number, address: Address) {
          this.listener = listener;
          this.mtuSize = mtuSize;
          this.address = address;
          this.lastUpdate = Date.now();

          for (let i = 0; i < 32; i++) {
               this.channelIndex[i] = 0;
          }
     }

     public update(timestamp: number): void {
          if ((this.lastUpdate + 10000) < timestamp) {
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
          this.listener.closeConnection(this, reason);
     }

     public recieve(buf: Buffer): void {
          this.isActive = true;
          this.lastUpdate = Date.now();
          let header: number = buf.readUInt8();

          if ((header & BitFlags.Valid) === 0) {
               // Recieved an offline packet
               return;
          } else if (header & BitFlags.Ack) {
               return this.handleACK(buf);
          } else if (header & BitFlags.Nack) {
               return this.handleNACK(buf);
          } else {
               return this.handleDatagram(buf);
          }
     }

     public handleDatagram(buf: Buffer): void {
          let dpk: DataPacket = new DataPacket();
          dpk.buffer = buf;
          dpk.read();
          if (dpk.sequenceNumber < this.windowStart || dpk.sequenceNumber > this.windowEnd || this.recievedWindow.includes(dpk.sequenceNumber)) {
               // Check if the packet is handled.
               return;
          }

          let diff: number = dpk.sequenceNumber - this.lastSequenceNumber;
          let index: number = this.nackQueue.indexOf(dpk.sequenceNumber);

          if (index > -1) {
               this.nackQueue.splice(index, 1);
          }

          this.ackQueue.push(dpk.sequenceNumber);
          this.recievedWindow.push(dpk.sequenceNumber);

          if (diff !== 1) {
               // Check for broken sequences and missing packets.
               for (let i = this.lastSequenceNumber + 1; i < dpk.sequenceNumber; i++) {
                    if (!this.recievedWindow.includes(i)) {
                         this.nackQueue.push(i);
                    }
               }
          }

          // Recieving lost packets
          if (diff >= 1) {
               this.lastSequenceNumber = dpk.sequenceNumber;
               this.windowStart += diff;
               this.windowEnd += diff;
          }

          for (let pk of dpk.packets) {
               this.receivePacket(pk as EncapsulatedPacket);
          }
     }

     public handleACK(buf: Buffer): void {
          let packet = new Ack();
          packet.buffer = buf;
          packet.read();

          for (let seq of packet.packets) {
               if (this.recoveryQueue.has(seq)) {
                    for (let pk of (this.recoveryQueue.get(seq) as DataPacket).packets) {
                         if (pk instanceof EncapsulatedPacket && pk.needACK && pk.messageIndex !== undefined) {
                              this.needACK.delete(pk.identifierACK);
                         }
                    }

                    this.recoveryQueue.delete(seq);
               }
          }
     }

     public handleNACK(buf: Buffer): void {
          let packet = new NAck();
          packet.buffer = buf;
          packet.read();

          for (let seq of packet.packets) {
               if (this.recoveryQueue.has(seq)) {
                    let pk: DataPacket = this.recoveryQueue.get(seq) as DataPacket;
                    pk.sequenceNumber = this.lastSequenceNumber++; // keep track of sequence???
                    this.packetToSend.push(pk);
                    this.recoveryQueue.delete(seq);
               }
          }
     }

     public receivePacket(packet: Packet|EncapsulatedPacket): void {
          if (packet.messageIndex === undefined) {
               // Handle directly because theres no index. (not encapsulated)
               this.handlePacket(packet);
          } else {
               if (packet.messageIndex < this.reliableWindowStart || packet.messageIndex > this.reliableWindowEnd) {
                    return;
               }

               if ((packet.messageIndex - this.lastReliableIndex) === 1) {
                    this.lastReliableIndex++;
                    this.reliableWindowStart++;
                    this.reliableWindowEnd++;
                    this.handlePacket(packet);

                    
                    if (this.reliableWindow.size > 0) {
                         this.reliableWindow.sort((a, b, c, d) => c - d);
                         for (let [seqIndex, pk] of this.reliableWindow) {
                              if ((seqIndex - this.lastReliableIndex) !== 1) {
                                   break;
                              }
                              this.lastReliableIndex++;
                              this.reliableWindowStart++;
                              this.reliableWindowEnd++;
                              this.handlePacket(pk);
                              this.reliableWindow.delete(seqIndex);
                         }
                    }
               } else {
                    this.reliableWindow.set(packet.messageIndex, packet);
               }
          }
     }

     public addEncapsulatedToQueue(packet: EncapsulatedPacket, flags: Priority = Priority.Normal): void {
          if ((packet.needACK = (flags & 0b00001000) > 0) === true) {
               this.needACK.set(packet.identifierACK, []);
          }

          switch(packet.reliability) {
               case 2:
               case 3:
               case 4:
               case 6:
               case 7:
                    packet.messageIndex = this.messageIndex++;

                    if (packet.reliability === 3) {
                         packet.orderIndex = this.channelIndex[packet.orderChannel]++;
                    }
               default:
                    break;
          }

          if (packet.getTotalLength() + 4 > this.mtuSize) {
               let buffers: any = [];
               let i: number = 0;
               let splitIndex: number = 0;

               while (i < packet.buffer.length) {
                    buffers.push([(splitIndex += 1) - 1, packet.buffer.slice(i, i += (this.mtuSize as unknown as number) - 34)]);
               }
               let splitID: number = ++this.splitID & 65536;
               for (let [count, buffer] of buffers) {
                    let pk: EncapsulatedPacket = new EncapsulatedPacket();
                    pk.splitID = splitID;
                    pk.split = true;
                    pk.splitCount = buffers.length;
                    pk.reliability = packet.reliability;
                    pk.splitIndex = count;
                    pk.buffer = buffer;

                    if (count > 0) {
                         pk.messageIndex = this.messageIndex++;
                    } else {
                         pk.messageIndex = packet.messageIndex;
                    }
                    if (pk.reliability === 3) {
                         pk.orderChannel = packet.orderChannel;
                         pk.orderIndex = packet.orderIndex;
                    }
                    this.addToQueue(pk, flags | Priority.Immediate);
               }
          } else {
               this.addToQueue(packet, flags);
          }
     }

     public addToQueue(pk: EncapsulatedPacket, flags: Priority = Priority.Normal): void {
          let priority: number = flags & 0b0000111;
          if (pk.needACK && pk.messageIndex === undefined) {
               this.needACK.set(pk.identifierACK, pk.messageIndex);
          }
          if (priority === Priority.Immediate) {
               let packet: DataPacket = new DataPacket();
               packet.sequenceNumber = this.sendSequenceNumber++;
               if (pk.needACK) {
                    packet.packets.push(Object.assign({}, pk));
                    pk.needACK = false;
               } else {
                    packet.packets.push(pk.toBinary());
               }
               this.sendPacket(packet);
               packet.sendTime = Date.now();
               this.recoveryQueue.set(packet.sequenceNumber, packet);

               return;
          }

          let length: number = this.sendQueueP.length();
          if (length + pk.getTotalLength() > this.mtuSize) {
               this.sendQueue();
          }

          if (pk.needACK) {
               this.sendQueueP.packets.push(pk);
               pk.needACK = false;
          } else {
               this.sendQueueP.packets.push(pk.toBinary());
          }
     }

     public handlePacket(packet: BinaryStream|DataPacket|Packet|EncapsulatedPacket): void {
          if ((packet as EncapsulatedPacket).split) {
               this.handleSplit(packet as EncapsulatedPacket);
               return;
          }

          let id: number = packet.buffer.readUInt8();
          let dataPacket, pk, sendPacket: DataPacket|OfflinePacket|Packet|EncapsulatedPacket;
          if (id < 0x80) {
               if (id === Identifiers.DisconnectNotification) {
                    this.disconnect('Client Disconnect');
                    return;
               } 
               if (this.state === Status.Connecting) {
                    if (id === Identifiers.ConnectionRequest) {
                         dataPacket = new ConnectionRequest();
                         dataPacket.buffer = packet.buffer;
                         dataPacket.read();

                         pk = new ConnectionRequestAccepted();
                         pk.clientAddress = this.address;
                         pk.requestTimestamp = dataPacket.requestTimestamp;
                         pk.accpetedTimestamp = BigInt(Date.now());
                         pk.write();

                         sendPacket = new EncapsulatedPacket();
                         sendPacket.reliability = 0;
                         sendPacket.buffer = pk.buffer;
                         this.addToQueue(sendPacket, Priority.Immediate);
                    } else if (id === Identifiers.NewIncomingConnection) {
                         dataPacket = new NewIncomingConnection();
                         dataPacket.buffer = packet.buffer;
                         dataPacket.read();

                         let serverPort: number = this.listener.port;
                         if (dataPacket.address.port === serverPort) {
                              this.state = Status.Connected;
                              this.listener.events.emit('connectionAccepted', this);
                         }
                    } else if (id === Identifiers.ConnectedPing) {
                         dataPacket = new ConnectedPing();
                         dataPacket.buffer = packet.buffer;
                         dataPacket.read();

                         pk = new ConnectedPong();
                         pk.clientTimestamp = dataPacket.clientTimestamp;
                         pk.serverTimestamp = BigInt(Date.now());
                         pk.write();

                         sendPacket = new EncapsulatedPacket();
                         sendPacket.reliability = Reliability.Unreliable;
                         sendPacket.buffer = pk.buffer;
                         this.addToQueue(sendPacket);
                    }
               }
          } else if (this.state === Status.Connected) {
               this.listener.events.emit('encapsulatedPacket', this.address, packet);
          }
     }

     /**
      * Handles packet spliting
      */
     public handleSplit(packet: EncapsulatedPacket): void {
          if (this.splitPackets.has(packet.splitID)) {
               let value = this.splitPackets.get(packet.splitID);
               value.set(packet.splitIndex, packet);
               this.splitPackets.set(packet.splitID, value);
          } else {
               this.splitPackets.set(packet.splitID, new Map([[packet.splitIndex, packet]]));
          }

          let localSplits = this.splitPackets.get(packet.splitID);
          if (localSplits.size === packet.splitCount) {
               let pk = new EncapsulatedPacket()

               let stream = new BinaryStream();
               for (let [_, packet] of localSplits) {
                    stream.append(packet.buffer);
               }
               this.splitPackets.delete(packet.splitID);

               pk.buffer = stream.buffer;
               this.receivePacket(pk);
          }
     }

     public sendQueue(): void {
          if (this.sendQueueP.packets.length > 0) {
               this.sendQueueP.sequenceNumber = this.sendSequenceNumber++;
               this.sendPacket(this.sendQueueP);
               this.sendQueueP.sendTime = Date.now();
               this.recoveryQueue.set(this.sendQueueP.sequenceNumber, this.sendQueueP);
               this.sendQueueP = new DataPacket();
          }
     }

     public sendPacket(pk: Packet): void {
          pk.write();
          this.listener.sendBuffer(this.address, pk.buffer);// send to connection.
     }

     public close(reason?: string) {
          let buff: Buffer = new Buffer(convertBinaryStringToUint8Array('\x00\x00\x08\x15'));
          let stream: BinaryStream = new BinaryStream(buff);
          this.addEncapsulatedToQueue(EncapsulatedPacket.fromBinary(stream), Priority.Immediate);
          this.listener.events.emit('connectionDestroyed', this.address, reason || "Disconnect");
     }
}
export default Connection;