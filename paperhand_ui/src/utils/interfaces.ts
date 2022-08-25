import { PublicKey, AccountInfo } from "@solana/web3.js";
import BN from "bn.js";

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
  bidderPubkey: PublicKey;
}

export interface MarketData {
  voucher: number;
  sol: number;
  liq: number;
}

export interface BoothAccount {
  boothId: BN;
  boothOwner: PublicKey;
  boothType: number;
  curve: number;
  delta: BN;
  nfts: BN;
  sol: BN;
  spotPrice: BN;
  tradeCount: BN;
}
