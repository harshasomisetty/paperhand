import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Connection,
  AccountInfo,
} from "@solana/web3.js";

export interface Project {
  pubkey: PublicKey;
  account: AccountInfo<Buffer>;
}
