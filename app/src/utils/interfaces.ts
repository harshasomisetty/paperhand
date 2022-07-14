import { PublicKey, AccountInfo } from "@solana/web3.js";

export interface Exhibit {
  pubkey: PublicKey;
  account: AccountInfo<Buffer>;
}

export interface MarketData {
  marketVoucherBal: number;
  marketSolBal: number;
  userVoucherBal: number;
  userSolBal: number;
  userLiqBal: number;
}
