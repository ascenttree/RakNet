import { BinaryStream } from 'https://raw.githubusercontent.com/RaptorsMC/BinaryUtils/master/mod.ts';
import AckowledgePacket from './AcknowledgePacket.ts';
import Identifiers from './Identifiers.ts';
class Ack extends AckowledgePacket {
    constructor() {
        super(Identifiers.AcknowledgePacket);
    }
}
export default Ack;