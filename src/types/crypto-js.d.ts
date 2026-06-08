// Type declarations for crypto-js
declare module 'crypto-js' {
  interface LibWordArray {
    words: number[];
    sigBytes: number;
  }

  interface CipherParams {
    ciphertext: LibWordArray;
    key?: LibWordArray;
    iv?: LibWordArray;
    salt?: LibWordArray;
  }

  interface Base64 {
    parse(input: string): LibWordArray;
    stringify(wordArray: LibWordArray): string;
  }

  interface Utf8 {
    parse(input: string): LibWordArray;
    stringify(wordArray: LibWordArray): string;
  }

  interface Enc {
    Base64: Base64;
    Utf8: Utf8;
    Hex: any;
  }

  interface MD5 {
   (message: string): string;
  }

  interface SHA256 {
   (message: string): string;
  }

  interface AES {
    encrypt(message: string, key: LibWordArray, options?: {
      iv?: LibWordArray;
      mode?: any;
      padding?: any;
    }): CipherParams;
    decrypt(cipherParams: CipherParams | { ciphertext: LibWordArray }, key: LibWordArray, options?: {
      iv?: LibWordArray;
      mode?: any;
      padding?: any;
    }): LibWordArray;
  }

  interface Mode {
    CBC: any;
    ECB: any;
  }

  interface Pad {
    Pkcs7: any;
    ZeroPadding: any;
  }

  interface lib {
    WordArray: {
      create(words?: number[], sigBytes?: number): LibWordArray;
      random(bytes: number): LibWordArray;
    };
    CipherParams: any;
  }

  const enc: Enc;
  const MD5: MD5;
  const SHA256: SHA256;
  const AES: AES;
  const mode: Mode;
  const pad: Pad;
  const lib: lib;

  export { enc, MD5, SHA256, AES, mode, pad, lib };
  export default {
    enc,
    MD5,
    SHA256,
    AES,
    mode,
    pad,
    lib
  };
}
