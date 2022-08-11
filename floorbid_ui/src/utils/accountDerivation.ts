import { Connection, PublicKey } from "@solana/web3.js";
import { Metaplex, Nft } from "@metaplex-foundation/js";
import { Creator } from "@metaplex-foundation/mpl-token-metadata";
import { getAssociatedTokenAddress } from "@solana/spl-token";

import {
  SHOP_PROGRAM_ID,
  EXHIBITION_PROGRAM_ID,
  CHECKOUT_PROGRAM_ID,
} from "../utils/constants";

export async function getVoucherAddress(nft: Nft): Promise<PublicKey[]> {
  let seeds: Buffer[] = [];

  nft.creators?.forEach((creatorKey: Creator) => {
    if (creatorKey.verified) {
      seeds.push(creatorKey.address.toBuffer());
    }
  });

  let [exhibit] = await PublicKey.findProgramAddress(
    [...seeds, Buffer.from("exhibit"), Buffer.from(nft.metadata?.symbol)],
    EXHIBITION_PROGRAM_ID
  );

  let [voucherMint] = await PublicKey.findProgramAddress(
    [Buffer.from("voucher_mint"), exhibit.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  return [exhibit, voucherMint];
}

export async function getExhibitAccounts(
  exhibit: PublicKey
): Promise<[PublicKey, number, PublicKey[], PublicKey]> {
  let marketTokens = new Array(2);

  let [marketAuth, authBump] = await PublicKey.findProgramAddress(
    [Buffer.from("market_auth"), exhibit.toBuffer()],
    SHOP_PROGRAM_ID
  );

  [marketTokens[0]] = await PublicKey.findProgramAddress(
    [Buffer.from("token_voucher"), marketAuth.toBuffer()],
    SHOP_PROGRAM_ID
  );

  [marketTokens[1]] = await PublicKey.findProgramAddress(
    [Buffer.from("token_sol"), marketAuth.toBuffer()],
    SHOP_PROGRAM_ID
  );

  let [liqMint] = await PublicKey.findProgramAddress(
    [Buffer.from("market_token_mint"), marketAuth.toBuffer()],
    SHOP_PROGRAM_ID
  );

  return [marketAuth, authBump, marketTokens, liqMint];
}

export async function getSwapAccounts(
  exhibit: PublicKey,
  publicKey: PublicKey
): Promise<[PublicKey, PublicKey, number, PublicKey[], PublicKey, PublicKey]> {
  let [marketAuth, authBump, marketTokens, liqMint] = await getExhibitAccounts(
    exhibit
  );

  let [voucherMint] = await PublicKey.findProgramAddress(
    [Buffer.from("voucher_mint"), exhibit.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  let userTokenVoucher = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

  return [
    voucherMint,
    marketAuth,
    authBump,
    marketTokens,
    userTokenVoucher,
    liqMint,
  ];
}

export async function getCheckoutAccounts(
  exhibit: PublicKey
): Promise<[PublicKey, number, PublicKey, PublicKey, PublicKey, PublicKey]> {
  let auth: PublicKey;
  let authBump: number;
  let bidOrders: PublicKey;
  let matchedOrdersAddress: PublicKey;

  let voucherMint, escrowVoucher, escrowSol: PublicKey;
  let bump: number;

  [auth, authBump] = await PublicKey.findProgramAddress(
    [Buffer.from("auth"), exhibit.toBuffer()],
    CHECKOUT_PROGRAM_ID
  );

  [escrowVoucher, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("escrow_voucher"), auth.toBuffer()],
    CHECKOUT_PROGRAM_ID
  );

  [escrowSol, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("escrow_sol"), exhibit.toBuffer()],
    CHECKOUT_PROGRAM_ID
  );

  [bidOrders, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("bid_orders"), exhibit.toBuffer()],
    CHECKOUT_PROGRAM_ID
  );

  [matchedOrdersAddress, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("matched_orders"), exhibit.toBuffer()],
    CHECKOUT_PROGRAM_ID
  );

  return [
    auth,
    authBump,
    bidOrders,
    matchedOrdersAddress,
    escrowVoucher,
    escrowSol,
  ];
}
