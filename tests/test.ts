import { Listener, EncapsulatedPacket, Connection, Address, MOTD } from '../mod.ts';

const listener: Listener = new Listener();

listener.events.on('connectionCreated', (connection: Connection) => {
     console.log(`${connection.address.token}: Attempting connection seqeunce [Not connected].`);
})
listener.events.on('connectionAccepted', (connection: Connection) => {
     console.log(`${connection.address.token}: Connected!`);
})
listener.events.on('connectionKicked', (address: Address, reason: string) => {
     console.log(`${address.token}: kicked for: ${reason}`);
})
listener.events.on('unconnectedPing', (address: Address, motd: MOTD) => {
     console.log(`${address.token}: Recieved Query.`);
     motd.players = { max: 100, online: 12 };
     motd.motd = 'RaptorsMC';
})
listener.events.on('encapsulatedPacket', (address: Address, packet: EncapsulatedPacket) => {
     console.log(`${address.token}: Sent encapsulated packet!`);
})
listener.listen();