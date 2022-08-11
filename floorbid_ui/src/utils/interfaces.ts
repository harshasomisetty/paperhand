import { PublicKey, AccountInfo } from "@solana/web3.js";

export interface Exhibit {
  pubkey: PublicKey;
  account: AccountInfo<Buffer>;
}

export interface UserData {
  voucher: number;
  sol: number;
  liq: number;
}

export interface BidInterface {
  sequenceNumber: number;
  bidPrice: number;
  bidderPubkey: number;
}

export interface MarketData {
  voucher: number;
  sol: number;
  liq: number;
}
