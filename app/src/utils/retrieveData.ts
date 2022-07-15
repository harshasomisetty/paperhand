import {
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

import {
  BAZAAR_PROGRAM_ID,
  EXHIBITION_PROGRAM_ID,
  getExhibitProgramAndProvider,
} from "@/utils/constants";
import { MarketData, UserData } from "@/utils/interfaces";
import { Metaplex, Nft } from "@metaplex-foundation/js";
import { Wallet } from "@project-serum/anchor";

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
): Promise<boolean> {
  let [exhibit] = await getExhibitAddress(nft);
  let exhibitExists = await checkIfAccountExists(exhibit, connection);
  return exhibitExists;
}

export async function checkIfSwapExists(
  exhibit: PublicKey,
  connection: Connection
): Promise<boolean> {
  let [marketAuth, authBump] = await PublicKey.findProgramAddress(
    [Buffer.from("market_auth"), exhibit.toBuffer()],
    BAZAAR_PROGRAM_ID
  );

  let swapExists = await checkIfAccountExists(marketAuth, connection);
  return swapExists;
}

export async function getExhibitAccountData(
  exhibit: PublicKey,
  wallet: Wallet
) {
  let { Exhibition } = await getExhibitProgramAndProvider(wallet);
  let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
  return exhibitInfo;
}

export async function getSwapAccounts(
  exhibit: PublicKey,
  publicKey: PublicKey
): Promise<[PublicKey, PublicKey, number, PublicKey[], PublicKey, PublicKey]> {
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

  let liqMint;
  [liqMint, temp] = await PublicKey.findProgramAddress(
    [Buffer.from("market_token_mint"), marketAuth.toBuffer()],
    BAZAAR_PROGRAM_ID
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
export async function getUserData(
  exhibit: PublicKey,
  publicKey: PublicKey,
  connection: Connection
): Promise<UserData> {
  let [
    voucherMint,
    marketAuth,
    authBump,
    marketTokens,
    userTokenVoucher,
    liqMint,
  ] = await getSwapAccounts(exhibit, publicKey);

  let userVoucherBal = 0;
  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

  if (await checkIfAccountExists(userVoucherWallet, connection)) {
    userVoucherBal = Number(
      (await getAccount(connection, userVoucherWallet)).amount
    );
  }

  let userLiq = await getAssociatedTokenAddress(liqMint, publicKey);
  let userLiqBal = 0;
  if (await checkIfAccountExists(userLiq, connection)) {
    userLiqBal = Number((await getAccount(connection, userLiq)).amount);
  }

  let userSol = Number(await connection.getBalance(publicKey));

  return {
    voucher: userVoucherBal,
    sol: userSol,
    liq: userLiqBal,
  };
}

export async function getMarketData(
  exhibit: PublicKey,
  connection: Connection
): Promise<MarketData> {
  let marketTokens = new Array(2);
  let marketAuth;
  let liqMint;
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

  [liqMint, temp] = await PublicKey.findProgramAddress(
    [Buffer.from("market_token_mint"), marketAuth.toBuffer()],
    BAZAAR_PROGRAM_ID
  );

  let marketVoucherBal = Number(
    (await getAccount(connection, marketTokens[0])).amount
  );
  let marketSol = Number(await connection.getBalance(marketTokens[1]));
  let marketLiqBal = Number((await getMint(connection, liqMint)).supply);

  return {
    voucher: marketVoucherBal,
    sol: marketSol,
    liq: marketLiqBal,
  };
}
