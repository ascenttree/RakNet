# RakNet
A fully functional RakNet implementation for Deno written in typescript.
Port of JSRaknet to Deno

This uses the following Dependents:
- `RaptorsMC/BinaryUtils`
- `RaptorsMC/Math`

# Api
Listener handles connections for you, for listening to events, you need to hook into `Listeners.events` which is an intance of a EventEmitter.

**TODO:**
- Event cancellation

##### Events
**`connectionCreated`** - Fired when a connection is established.
```ts
listener.events.on('connectionCreated', (connection: Connection) => {});
```

**`connectionAccepted`** - Fired when a connection is added to the listener, and finishes ACK sequence.
```ts
listener.events.on('connectionAccepted', (connection: Connection) => {});
```

**`connectionKicked`** - Fired if a connection fails ACK sequence.
```ts
listener.events.on('connectionKicked', (address: Address) => {});
```

**`connectionDestroyed`** - Fired when a connection leaves or is disconnected.
```ts
listener.events.on('connectionDestroyed', (address: Address, reason: string) => {});
```

**`encapsulatedPacket`** - Fired when a connection sends a Encapsulated Packet to the server.
```ts
listener.events.on('encapsulatedPacket', (address: Address, packet: EncapsulatedPacket) => {});
```

**`unconnectedPing`** - Fired when a client pings the server.
```ts
listener.events.on('unconnectedPing', (address: Address, motd: MOTD) => {
     motd.serverName = 'RaptorsMC';
});
```