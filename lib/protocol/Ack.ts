import { BinaryStream } from '../../incl/BinaryUtils/mod.ts';
import AckowledgePacket from './AcknowledgePacket.ts';
import Identifiers from './Identifiers.ts';
class Ack extends AckowledgePacket {
    constructor() {
        super(Identifiers.AcknowledgePacket);
    }
}
export default Ack;