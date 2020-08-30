import AcknowledgePacket from './AcknowledgePacket.ts';
import Identifiers from './Identifiers.ts';

class NAck extends AcknowledgePacket {
     constructor() {
          super(Identifiers.NacknowledgePacket);
     }
}
export default NAck;