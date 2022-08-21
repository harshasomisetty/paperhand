import {
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

import {
  SHOP_PROGRAM_ID,
  getExhibitProgramAndProvider,
  getCheckoutProgramAndProvider,
} from "@/utils/constants";
import { MarketData, UserData, BidInterface } from "@/utils/interfaces";
import { Metaplex, Nft } from "@metaplex-foundation/js";
import { Wallet } from "@project-serum/anchor";
import {
  getNftDerivedAddresses,
  getShopAccounts,
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
  connection
): Promise<boolean> {
  // console.log("connection print", connection);
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
  let { exhibit } = await getNftDerivedAddresses(nft);
  let exhibitExists = await checkIfAccountExists(exhibit, connection);
  return exhibitExists;
}

export async function checkIfSwapExists(
  exhibit: PublicKey,
  connection: Connection
): Promise<boolean> {
  let { marketAuth } = await getShopAccounts(exhibit);

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
  let { voucherMint, liqMint } = await getShopAccounts(exhibit);

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
  let { marketTokens, liqMint } = await getShopAccounts(exhibit);

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

export async function getBidOrderData(
  exhibit: PublicKey,
  connection: Connection,
  wallet: Wallet
): Promise<{
  prices: number[];
  size: number[];
  bids: { [key: string]: BidInterface[] };
}> {
  let { Checkout } = await getCheckoutProgramAndProvider(wallet);

  let { bidOrders } = await getCheckoutAccounts(exhibit);

  let bids: { [pubkey: string]: BidInterface[] } = {};

  let prices: number[] = [];
  let size: number[] = [];

  if (await checkIfAccountExists(bidOrders, connection)) {
    let account = await Checkout.account.bidOrders.fetch(bidOrders);

    let i = 0;
    while (account.heap.items[i].bidPrice > 0) {
      let curItem: BidInterface = account!.heap!.items![i];
      if (bids[curItem.bidderPubkey!.toString()]) {
        bids[curItem.bidderPubkey.toString()].push(curItem);
      } else {
        bids[curItem.bidderPubkey.toString()] = [curItem];
      }
      i++;
    }

    for (let pubkey of Object.keys(bids)) {
      bids[pubkey] = bids[pubkey].sort((a, b) =>
        a.bidPrice < b.bidPrice ? 1 : -1
      );
    }

    let orderbookData = {};

    for (let pubkey of Object.keys(bids)) {
      for (let bid of bids[pubkey]) {
        // let bidPrice = Number(bid.bidPrice);
        let bidPrice = Number(Number(bid.bidPrice) / LAMPORTS_PER_SOL);
        console.log("bid price?", bidPrice);
        if (orderbookData[bidPrice]) {
          orderbookData[bidPrice]++;
        } else {
          orderbookData[bidPrice] = 1;
        }
      }
    }

    let tempLabels = Object.keys(orderbookData);

    for (let i = 0; i < tempLabels.length; i++) {
      prices.push(Number(tempLabels[i]));
    }

    prices = prices.sort((a, b) => b - a);

    let curVal = 0;
    for (let lab of prices) {
      curVal += orderbookData[lab];
      size.push(curVal);
    }
  }
  // labels are prices, values are size, bids are bids by user
  return { prices, size, bids };
}

export async function getMatchedOrdersAccountData(
  matchedStorage: PublicKey,
  wallet: Wallet
) {
  let { Checkout } = await getCheckoutProgramAndProvider(wallet);

  let matchedOrdersInfo = await Checkout.account.matchedStorage.fetch(
    matchedStorage
  );

  return matchedOrdersInfo;
}

export async function getFilledOrdersList(
  matchedStorage: PublicKey,
  wallet: Wallet
): Promise<Record<string, number>> {
  let { Checkout } = await getCheckoutProgramAndProvider(wallet);

  let matchedStorageInfo = await getMatchedOrdersAccountData(
    matchedStorage,
    wallet
  );
  let matchedOrders = matchedStorageInfo.matchedOrders;

  let matchedOrdersInfo = await Checkout.account.matchedOrders.fetch(
    matchedOrders
  );

  let orderFilled: Record<string, number> = {};
  for (let order of matchedOrdersInfo.trades.orders) {
    let tempPubkey: string = order.val.toString();
    if (tempPubkey in orderFilled) {
      orderFilled[tempPubkey]++;
    } else {
      orderFilled[tempPubkey] = 1;
    }
  }
  return orderFilled;
}
