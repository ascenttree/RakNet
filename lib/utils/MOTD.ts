import { Protocol } from "../protocol/Protocol.ts";

interface PlayerCount {
     online: number;
     max: number;
}

class MOTD {
     public motd: string = 'Netrex Server';
     public name: string = 'NetrexRakNet';
     public protocol: Protocol = Protocol.CURRENT_PROTOCOL;
     public version: string = '1.17.0';
     public players: PlayerCount = {
          online: 0,
          max: 100
     };
     public gamemode: string = 'Creative';
     public serverId: bigint = BigInt(0);
     
     public toString(): string {
          return [
               'MCPE',
               this.motd,
               this.protocol,
               this.version,
               this.players.online,
               this.players.max,
               this.serverId,
               this.name,
               this.gamemode
          ].join(';') + ';';
     }
}
export default MOTD;