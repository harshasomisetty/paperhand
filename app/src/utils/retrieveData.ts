import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, Connection } from "@solana/web3.js";

import {
  EXHIBITION_PROGRAM_ID,
  BAZAAR_PROGRAM_ID,
  getExhibitProgramAndProvider,
} from "@/utils/constants";
import { Metaplex, Nft } from "@metaplex-foundation/js";
import { Wallet } from "@project-serum/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { MarketData } from "./interfaces";

export async function getUserVoucherTokenBal(
  exhibit: PublicKey,
  publicKey: PublicKey | null,
  connection: Connection
): Promise<bigint> {
  let [voucherMint] = await PublicKey.findProgramAddress(
    [Buffer.from("voucher_mint"), exhibit.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  let userVoucherTokenBal = await getAccount(connection, userVoucherWallet);
  return userVoucherTokenBal.amount;
}

export async function getAllExhibitArtifacts(
  exhibit: PublicKey,
  connection: Connection
): Promise<Nft[] | null> {
  const metaplex = Metaplex.make(connection);
  let allArtifactAccounts = (
    await connection.getTokenAccountsByOwner(exhibit, {
      programId: TOKEN_PROGRAM_ID,
    })
  ).value;

  let artifactMints = [];
  for (let i = 0; i < allArtifactAccounts.length; i++) {
    let tokenAccount = await getAccount(
      connection,
      allArtifactAccounts[i].pubkey
    );
    artifactMints.push(tokenAccount.mint);
  }

  let allNfts = await metaplex.nfts().findAllByMintList(artifactMints);
  return allNfts;
}

export async function getExhibitAddress(nft: Nft): Promise<PublicKey[]> {
  let seeds: Buffer[] = [];
  nft.creators?.forEach((creatorKey) => {
    if (creatorKey.verified) {
      // console.log("verified", creatorKey.address.toString());
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

export async function checkIfAccountExists(
  account: PublicKey,
  connection: Connection
): Promise<boolean> {
  let bal = await connection.getBalance(account);
  if (bal > 0) {
    return true;
  } else {
    return false;
  }
}

export async function checkIfExhibitExists(
  nft: Nft,
  connection: Connection
): Promise<Boolean> {
  let [exhibit] = await getExhibitAddress(nft);
  let exhibitExists = await checkIfAccountExists(exhibit, connection);
  return exhibitExists;
}

export async function getExhibitAccountData(
  exhibit: PublicKey,
  wallet: Wallet
) {
  let { Exhibition } = await getExhibitProgramAndProvider(wallet);
  let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
  return exhibitInfo;
}

export async function getMarketData(
  exhibit: PublicKey,
  userKey: PublicKey,
  connection: Connection
): Promise<MarketData> {
  let marketTokens = new Array(2);
  let marketAuth;
  let temp;

  [marketAuth, temp] = await PublicKey.findProgramAddress(
    [Buffer.from("market_auth"), exhibit.toBuffer()],
    BAZAAR_PROGRAM_ID
  );

  [marketTokens[0], temp] = await PublicKey.findProgramAddress(
    [Buffer.from("token_voucher"), marketAuth.toBuffer()],
    BAZAAR_PROGRAM_ID
  );

  [marketTokens[1], temp] = await PublicKey.findProgramAddress(
    [Buffer.from("token_sol"), marketAuth.toBuffer()],
    BAZAAR_PROGRAM_ID
  );

  let marketVoucherBal = await getAccount(connection, marketTokens[0]);
  let marketSol = await connection.getBalance(marketTokens[1]);

  let userTokenVoucherBal = await getUserVoucherTokenBal(
    exhibit,
    userKey,
    connection
  );
  let userSol = await connection.getBalance(userKey);

  return {
    marketVoucherBal: Number(marketVoucherBal.amount),

    marketSolBal: Number(marketSol),
    userVoucherBal: Number(userTokenVoucherBal),

    userSolBal: Number(userSol),
  };
}

export async function getSwapAccounts(
  exhibit: PublicKey,
  publicKey: PublicKey
): Promise<[PublicKey, PublicKey, number, PublicKey[], PublicKey]> {
  let [voucherMint] = await PublicKey.findProgramAddress(
    [Buffer.from("voucher_mint"), exhibit.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );
  let [marketAuth, authBump] = await PublicKey.findProgramAddress(
    [Buffer.from("market_auth"), exhibit.toBuffer()],
    BAZAAR_PROGRAM_ID
  );

  let marketTokens = new Array(2);

  let temp;

  [marketTokens[0], temp] = await PublicKey.findProgramAddress(
    [Buffer.from("token_voucher"), marketAuth.toBuffer()],
    BAZAAR_PROGRAM_ID
  );

  [marketTokens[1], temp] = await PublicKey.findProgramAddress(
    [Buffer.from("token_sol"), marketAuth.toBuffer()],
    BAZAAR_PROGRAM_ID
  );

  let userTokenVoucher = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );
  return [voucherMint, marketAuth, authBump, marketTokens, userTokenVoucher];
}
