/**
 *    ______            _                 ___  ________ 
 *    | ___ \          | |                |  \/  /  __ \
 *    | |_/ /__ _ _ __ | |_ ___  _ __ ___ | .  . | /  \/
 *    |    // _` | '_ \| __/ _ \| '__/ __|| |\/| | |    
 *    | |\ \ (_| | |_) | || (_) | |  \__ \| |  | | \__/\
 *    \_| \_\__,_| .__/ \__\___/|_|  |___/\_|  |_/\____/
 *               | |                                    
 *               |_|      
 * 
 * Misuse or redistribution of this code is strictly prohibted.
 * This applies to, and is not limited to self projects and open source projects.
 * If you wish to use this projects code, please contact us.
 * © RaptorsMC 2020
 * 
 * @author RaptorsMC
 * @copyright https://github.com/RaptorsMC
 * @license RaptorsMC/CustomLicense
 */
import Address from './utils/Address.ts';
import Connection from './connection/Connection.ts';
import Buffer from 'https://deno.land/std/node/buffer.ts';
import EventEmitter from 'https://deno.land/std@0.67.0/node/events.ts';
import { BinaryStream,  } from 'https://raw.githubusercontent.com/RaptorsMC/BinaryUtils/master/mod.ts';
import { randomBytes } from './utils/Utilities.ts';
import UnconnectedPing from './protocol/UnconnectedPing.ts';
import UnconnectedPong from './protocol/UnconnectedPong.ts';
import MOTD from "./utils/MOTD.ts";
import Identifiers from "./protocol/Identifiers.ts";
import DataPacket from "./protocol/DataPacket.ts";
import EncapsulatedPacket from "./protocol/EncapsulatedPacket.ts";
import Packet from "./protocol/Packet.ts";
import OpenConnectionRequestOne from "./protocol/OpenConnectionRequestOne.ts";
import OpenConnectionReplyOne from "./protocol/OpenConnectionReplyOne.ts";
import IncompatibleProtocolVersion from "./protocol/IncompatibleProtocolVersion.ts";
import { Protocol } from "./protocol/Protocol.ts";
import OpenConnectionRequestTwo from "./protocol/OpenConnectionRequestTwo.ts";
import OpenConnectionReplyTwo from "./protocol/OpenConnectionReplyTwo.ts";

class Listener {
     private SINGLE_TICK: number = 50;
     private shutdown: boolean = false;
     private shuttingDown: boolean = false;
     private socket!: Deno.DatagramConn;
     public events: EventEmitter;
     public connections: Map<string, Connection>;
     public address: string;
     public port: number;
     public serverId: bigint;

     constructor() {
          let idBuff: Uint8Array = randomBytes(8);
          this.connections = new Map();
          this.address = '127.0.0.1';
          this.port = 19132;
          this.events = new EventEmitter();
          this.serverId = new DataView(new Buffer(idBuff).buffer, idBuff.byteOffset, idBuff.byteLength).getBigInt64(0);
     }

     public async listen(address: string = '127.0.0.1', port: number = 19132): Promise<void> {
          this.address = address;
          this.port = port;

          //Deno.net i need to expose this
          
          this.socket = Deno.listenDatagram({
               hostname: address,
               port: port,
               transport: 'udp'
          });
          this.tick();
          try {
               for await (const conn of this.socket) {
                    const address = Address.from(conn[1]);
                    const stream = new Buffer(conn[0]);
                    // Read packet header
                    let header: number = stream.readUInt8();
                    
                    if (this.connections.has(address.token)) {
                         let connection: Connection = this.connections.get(address.token) as Connection;
                         connection.recieve(stream);
                    } else {
                         // Query
                         switch(header) {
                              case Identifiers.UnconnectedPing:
                                   this.handleUnconnectedPing(address, stream);
                              break;
                              case Identifiers.OpenConnectionRequest1:
                                   console.log(`${address.token}: Connecting....`)
                                   this.handleOpenConnectionRequest1(address, stream);
                              break;
                              case Identifiers.OpenConnectionRequest2:
                                   this.handleOpenConnectionRequest2(address, stream);
                              break;
                         }
                    }
               }
          } catch (e) {
               console.error(e);
               if (!this.shutdown) {
                    return;
               }
          }
     }

     public async handleUnconnectedPing(address: Address, buffer: Buffer): Promise<void> {
          let decodedPacket, packet: UnconnectedPing|UnconnectedPong;
          let motd: MOTD = new MOTD();

          decodedPacket = new UnconnectedPing();
          decodedPacket.buffer = buffer;
          decodedPacket.read();

          if (!decodedPacket.valid) {
               return; // invalid
          }

          packet = new UnconnectedPong();
          packet.sendTimestamp = decodedPacket.sendTimestamp;
          packet.serverGUID = this.serverId;

          this.events.emit('unconnectedPing', address, motd);

          packet.serverName = motd.toString();
          packet.write();

          this.sendBuffer(address, packet.buffer);
     }

     public async handleOpenConnectionRequest1(address: Address, buffer: Buffer): Promise<void> {
          let decodedPacket, packet: OpenConnectionRequestOne|OpenConnectionReplyOne|IncompatibleProtocolVersion;

          decodedPacket = new OpenConnectionRequestOne();
          decodedPacket.buffer = buffer;
          decodedPacket.read();

          if (!decodedPacket.valid) {
               return; // invalid
          }
          
          if (decodedPacket.protocol !== Protocol.PROTOCOL_VERSION) {
               packet = new IncompatibleProtocolVersion();
               packet.protocol = Protocol.PROTOCOL_VERSION;
               packet.serverGUID = this.serverId;
               packet.write();
               return this.sendBuffer(address, packet.buffer);
          }

          packet = new OpenConnectionReplyOne();
          packet.serverGUID = this.serverId;
          packet.mtuSize = decodedPacket.mtuSize;
          packet.write();

          return this.sendBuffer(address, packet.buffer);
     }
     
     public async handleOpenConnectionRequest2(address: Address, buffer: Buffer): Promise<void> {
          let decodedPacket, packet: OpenConnectionRequestTwo|OpenConnectionReplyTwo;

          decodedPacket = new OpenConnectionRequestTwo();
          decodedPacket.buffer = buffer;
          decodedPacket.read();

          if (!decodedPacket.valid) {
               return; // invalid
          }

          packet = new OpenConnectionReplyTwo();
          packet.serverGUID = this.serverId;
          packet.mtuSize = decodedPacket.mtuSize;
          packet.clientAddress = address;
          packet.write();

          const connection: Connection = new Connection(this, decodedPacket.mtuSize, address);
          this.connections.set(address.token, connection);

          this.events.emit('connectionAccepted', connection);

          return this.sendBuffer(address, packet.buffer);
     }

     public closeConnection(connection: Connection, reason: string): void {
          if (this.connections.has(connection.address.token)) {
               connection.close();
               this.connections.delete(connection.address.token);
          }
          this.events.emit('connectionDestroyed', connection.address, reason);
     }

     public sendBuffer(address: Address, buffer: Buffer): void {
          try {
               this.socket.send(buffer, address.toDenoAddr());
          } catch (e) {
               console.log('Address: ' + address.token, 'Buffer: ' + buffer.toString());
               console.error(e);
          }
     }

     public tick(): void {
          let interval: number = setInterval(() => {
               if (!this.shutdown) {
                    for (let [_, connection]of this.connections) {
                         connection.update(Date.now());
                    }
               } else {
                    clearInterval(interval);
                    this.stop();
               }
          }, this.SINGLE_TICK);
     }

     public stop(): void {
          if (this.shuttingDown) {
               return;
          }
          this.shuttingDown = true;
          this.shutdown = true;
          for (let [_, connection]of this.connections) {
               this.closeConnection(connection, 'RakNet Shutdown');
          }
          return this.socket.close();
     }
}
export default Listener;