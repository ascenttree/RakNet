class Reliability {
     public static Unreliable: number = 0;
     public static UnreliableSequenced: number = 1;
     public static Reliable: number = 2;
     public static ReliableOrdered: number = 3;
     public static ReliableSequenced: number = 4;
     public static UnreliableWithAckReceipt: number = 5;
     public static ReliableWithAckReceipt: number = 6;
     public static ReliableOrderedWithAckReceipt: number = 7;
 
     public static reliable(reliability: number): boolean {
         switch (reliability) {
             case this.Reliable:
             case this.ReliableOrdered:
             case this.ReliableSequenced:
                 return true;
             default:
                 return false;
         }
     }
 
     public static sequencedOrOrdered(reliability: number) {
         switch (reliability) {
             case this.UnreliableSequenced:
             case this.ReliableOrdered:
             case this.ReliableSequenced:
                 return true;
             default:
                 return false;
         }
     }
 
     public static sequenced(reliability: number) {
         switch (reliability) {
             case this.UnreliableSequenced:
             case this.ReliableSequenced:
                 return true;
             default:
                 return false;
         }   
     }
 }
 export default Reliability;