import { PublicKey, AccountInfo } from "@solana/web3.js";

export interface Project {
  pubkey: PublicKey;
  account: AccountInfo<Buffer>;
}
