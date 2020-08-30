import Identifiers from "./Identifiers.ts";
import OfflinePacket from './OfflinePacket.ts';

class DisconnectNotification extends OfflinePacket {
     constructor() {
          super(Identifiers.DisconnectNotification);
     }
}
export default DisconnectNotification;