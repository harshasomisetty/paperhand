import { Connection, PublicKey } from "@solana/web3.js";
import { Metaplex, Nft } from "@metaplex-foundation/js";
import { Creator } from "@metaplex-foundation/mpl-token-metadata";
import { getAssociatedTokenAddress } from "@solana/spl-token";

import {
  SHOP_PROGRAM_ID,
  EXHIBITION_PROGRAM_ID,
  CHECKOUT_PROGRAM_ID,
} from "../utils/constants";

export async function getNftDerivedAddresses(
  nft: Nft
): Promise<{ exhibit: PublicKey; voucherMint: PublicKey }> {
  // export async function getVoucherAddress(nft: Nft): Promise<PublicKey[]> {
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

  return { exhibit, voucherMint };
}

export async function getShopAccounts(exhibit: PublicKey): Promise<{
  voucherMint: PublicKey;
  marketAuth: PublicKey;
  shopAuthBump: number;
  marketTokens: PublicKey[];
  liqMint: PublicKey;
}> {
  let marketTokens = new Array(2);

  let [voucherMint] = await PublicKey.findProgramAddress(
    [Buffer.from("voucher_mint"), exhibit.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  let [marketAuth, shopAuthBump] = await PublicKey.findProgramAddress(
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

  return {
    voucherMint,
    marketAuth,
    shopAuthBump,
    marketTokens,
    liqMint,
  };
}

export async function getCheckoutAccounts(exhibit: PublicKey): Promise<{
  voucherMint: PublicKey;
  matchedStorage: PublicKey;
  bidOrders: PublicKey;
  checkoutAuth: PublicKey;
  checkoutAuthBump: number;
  escrowSol: PublicKey;
  escrowVoucher: PublicKey;
}> {
  let [voucherMint] = await PublicKey.findProgramAddress(
    [Buffer.from("voucher_mint"), exhibit.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  let [matchedStorage] = await PublicKey.findProgramAddress(
    [Buffer.from("matched_orders"), exhibit.toBuffer()],
    CHECKOUT_PROGRAM_ID
  );

  let [bidOrders] = await PublicKey.findProgramAddress(
    [Buffer.from("bid_orders"), exhibit.toBuffer()],
    CHECKOUT_PROGRAM_ID
  );

  let [checkoutAuth, checkoutAuthBump] = await PublicKey.findProgramAddress(
    [Buffer.from("checkout_auth"), exhibit.toBuffer()],
    CHECKOUT_PROGRAM_ID
  );

  let [escrowVoucher] = await PublicKey.findProgramAddress(
    [Buffer.from("escrow_voucher"), checkoutAuth.toBuffer()],
    CHECKOUT_PROGRAM_ID
  );

  let [escrowSol] = await PublicKey.findProgramAddress(
    [Buffer.from("escrow_sol"), exhibit.toBuffer()],
    CHECKOUT_PROGRAM_ID
  );

  return {
    voucherMint,
    matchedStorage,
    bidOrders,
    checkoutAuth,
    checkoutAuthBump,
    escrowSol,
    escrowVoucher,
  };
}
