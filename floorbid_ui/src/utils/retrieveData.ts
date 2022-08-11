import {
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

import {
  SHOP_PROGRAM_ID,
  getExhibitProgramAndProvider,
  getCheckoutProgramAndProvider,
} from "@/utils/constants";
import { MarketData, UserData, BidInterface } from "@/utils/interfaces";
import { Metaplex, Nft } from "@metaplex-foundation/js";
import { Wallet } from "@project-serum/anchor";
import {
  getExhibitAccounts,
  getVoucherAddress,
  getSwapAccounts,
  getCheckoutAccounts,
} from "@/utils/accountDerivation";

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

export async function getAllNftImages(nfts: Nft[]): Promise<string[]> {
  let imagePromises = [];
  for (let nft of nfts) {
    if (!nft.metadataTask.isRunning()) {
      imagePromises.push(nft.metadataTask.run());
    } else {
      imagePromises.push(nft.metadataTask.reset().run());
    }
  }
  await Promise.all(imagePromises);
  let images = [];
  for (let nft of nfts) {
    images.push(nft.metadata.image);
  }

  return images;
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
  let [exhibit] = await getVoucherAddress(nft);
  let exhibitExists = await checkIfAccountExists(exhibit, connection);
  return exhibitExists;
}

export async function checkIfSwapExists(
  exhibit: PublicKey,
  connection: Connection
): Promise<boolean> {
  let [marketAuth, authBump] = await PublicKey.findProgramAddress(
    [Buffer.from("market_auth"), exhibit.toBuffer()],
    SHOP_PROGRAM_ID
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
  let [marketAuth, authBump, marketTokens, liqMint] = await getExhibitAccounts(
    exhibit
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

export async function getCheckoutOrderData(
  exhibit: PublicKey,
  wallet: Wallet
): Promise<BidInterface[]> {
  let { Checkout } = await getCheckoutProgramAndProvider(wallet);
  let [
    auth,
    authBump,
    bidOrders,
    matchedOrdersAddress,
    escrowVoucher,
    escrowSol,
  ] = await getCheckoutAccounts(exhibit);
  let account = await Checkout.account.bidOrders.fetch(bidOrders);
  let bids = [];

  let i = 0;
  while (account.heap.items[i].bidPrice > 0) {
    i++;
    bids.push({
      sequenceNumber: account.heap.items[i].sequenceNumber,

      bidPrice: account.heap.items[i].bidPrice,
      bidderPubkey: account.heap.items[i].bidderPubkey,
    });
  }
  return bids.sort((a, b) => a.bidPrice - b.bidPrice);
}
