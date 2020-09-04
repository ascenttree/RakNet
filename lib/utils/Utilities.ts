export function randomBytes(length: number): Uint8Array {
     const n = new Uint8Array(length);
     for (let i = 0; i < length; i++) n[i] = ((Math.random() * 254) | 0) + 1;
     return n;
}