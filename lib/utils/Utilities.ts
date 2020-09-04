export function randomBytes(length: number): Uint8Array {
     const n = new Uint8Array(length);
     for (let i = 0; i < length; i++) n[i] = ((Math.random() * 254) | 0) + 1;
     return n;
}
interface WordArray {
      words: number[];
      sigBytes: number;
}
export function convertWordArrayToUint8Array(wordArray: WordArray) {
	var len = wordArray.words.length,
		u8_array = new Uint8Array(len << 2),
		offset = 0, word, i
	;
	for (i=0; i<len; i++) {
		word = wordArray.words[i];
		u8_array[offset++] = word >> 24;
		u8_array[offset++] = (word >> 16) & 0xff;
		u8_array[offset++] = (word >> 8) & 0xff;
		u8_array[offset++] = word & 0xff;
	}
	return u8_array;
}

export function convertUint8ArrayToWordArray(u8Array: Uint8Array) {
	var words = [], i = 0, len = u8Array.length;

	while (i < len) {
		words.push(
			(u8Array[i++] << 24) |
			(u8Array[i++] << 16) |
			(u8Array[i++] << 8)  |
			(u8Array[i++])
		);
	}

	return {
		sigBytes: words.length * 4,
		words: words
	};
}

export function convertUint8ArrayToBinaryString(u8Array: Uint8Array) {
	var i, len = u8Array.length, b_str = "";
	for (i=0; i<len; i++) {
		b_str += String.fromCharCode(u8Array[i]);
	}
	return b_str;
}

export function convertBinaryStringToUint8Array(bStr: string) {
	var i, len = bStr.length, u8_array = new Uint8Array(len);
	for (i = 0; i < len; i++) {
		u8_array[i] = bStr.charCodeAt(i);
	}
	return u8_array;
}