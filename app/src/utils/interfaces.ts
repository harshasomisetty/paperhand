import { PublicKey, AccountInfo } from "@solana/web3.js";

export interface Exhibit {
  pubkey: PublicKey;
  account: AccountInfo<Buffer>;
}
