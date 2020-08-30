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
import { BinaryStream } from '../incl/BinaryUtils/mod.ts';

class Listener {
     private socket!: Deno.DatagramConn;
     public connections: Map<Address, Connection>;

     constructor() {
          this.connections = new Map();
     }

     async listen(address: string = '127.0.0.1', port: number = 19132): Promise<void> {
          this.socket = Deno.listenDatagram({
               hostname: address,
               port: port,
               transport: 'udp'
          });

          for await (const conn of this.socket) {
               const address = Address.from(conn[0]);
               const stream = new BinaryStream(Buffer.from(conn[0]));
               // Read packet header
               stream.buffer.readUInt8();
          }
     }
}
export default Listener;