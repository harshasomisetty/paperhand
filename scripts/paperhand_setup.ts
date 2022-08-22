import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  Nft,
} from "@metaplex-foundation/js";
import { BN, Program } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  getNftDerivedAddresses,
  getCheckoutAccounts,
  getShopAccounts,
} from "../utils/accountDerivation";
import { getProvider, initAssociatedAddressIfNeeded } from "../utils/actions";
import {
  CHECKOUT_PROGRAM_ID,
  creator,
  EXHIBITION_PROGRAM_ID,
  otherCreators,
  SHOP_PROGRAM_ID,
  users,
} from "../utils/constants";
import { mintNFTs } from "../utils/createNFTs";

import { Exhibition, IDL as EXHIBITION_IDL } from "../target/types/exhibition";
import { IDL as SHOP_IDL, Shop } from "../target/types/shop";
import { IDL as CHECKOUT_IDL, Checkout } from "../target/types/checkout";
import { airdropAll } from "../utils/helpfulFunctions";
const connection = new Connection("http://localhost:8899", "processed");

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(creator))
  .use(bundlrStorage());

let mintNumberOfCollections = 2;
let mintNumberOfNfts = 10;
let nftList: Nft[][] = Array(mintNumberOfCollections);

let Exhibition;
let Checkout;
let Shop;

let initAmounts = [2, 6];
let liqAmounts = [1];
let swapAmount = [1];

//voucher wallets for both users
// nft token account
let nftUserTokenAccount;

export async function airdropAndMint() {
  let provider = await getProvider("http://localhost:8899", creator);

  Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);
  Checkout = new Program(CHECKOUT_IDL, CHECKOUT_PROGRAM_ID, provider);
  Shop = new Program(SHOP_IDL, SHOP_PROGRAM_ID, provider);

  let airdropVal = 150 * LAMPORTS_PER_SOL;

  let airdropees = [...otherCreators, ...users, creator];
  await airdropAll(airdropees, airdropVal, connection);

  nftList = await mintNFTs(
    mintNumberOfNfts,
    mintNumberOfCollections,
    metaplex,
    connection
  );

  console.log("Minted all nfts!");
}

export async function initializeExhibit(nft: Nft) {
  let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

  const init_exhibit_tx = await Exhibition.methods
    .initializeExhibit()
    .accounts({
      exhibit: exhibit,
      voucherMint: voucherMint,
      nftMetadata: nft.metadataAccount.publicKey,
      creator: creator.publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();
  let transaction = new Transaction().add(init_exhibit_tx);

  let signature = await sendAndConfirmTransaction(connection, transaction, [
    creator,
  ]);
  await connection.confirmTransaction(signature, "confirmed");
  let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);

  console.log("Initialized exhibit!", exhibitInfo.exhibitSymbol);
}

export async function insertNft(nft: Nft) {
  let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(nft);

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    users[0].publicKey
  );

  let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    users[0],
    nft.mint,
    users[0].publicKey
  );

  await initAssociatedAddressIfNeeded(
    connection,
    userVoucherWallet,
    voucherMint,
    users[0]
  );

  let insert_tx = await Exhibition.methods
    .artifactInsert()
    .accounts({
      exhibit: exhibit,
      voucherMint: voucherMint,
      userVoucherWallet: userVoucherWallet,
      nftMint: nft.mint,
      nftMetadata: nft.metadataAccount.publicKey,
      nftUserToken: nftUserTokenAccount.address,
      nftArtifact: nftArtifact,
      delegateSigner: users[0].publicKey,
      signer: users[0].publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  let transaction = new Transaction().add(insert_tx);

  let signature = await sendAndConfirmTransaction(connection, transaction, [
    users[0],
  ]);

  await connection.confirmTransaction(signature, "confirmed");

  let postNftArtifactBal = await getAccount(connection, nftArtifact);

  let postUserVoucherTokenBal = await getAccount(connection, userVoucherWallet);

  console.log(
    "Inserted NFT! Artifact bal, userVoucherBal",
    Number(postNftArtifactBal.amount),
    Number(postUserVoucherTokenBal.amount)
  );
}

async function initializeSwap(nft: Nft) {
  let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(nft);

  let { marketAuth, shopAuthBump, marketTokens, liqMint } =
    await getShopAccounts(exhibit);

  let marketTokenFee = await getAssociatedTokenAddress(
    liqMint,
    marketAuth,
    true
  );

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    users[0].publicKey
  );
  let userTokenLiq = await getAssociatedTokenAddress(
    liqMint,
    users[0].publicKey
  );

  const initialize_market_tx = await Shop.methods
    .initializeMarket(
      new BN(initAmounts[0]),
      new BN(initAmounts[1] * LAMPORTS_PER_SOL),
      shopAuthBump
    )
    .accounts({
      exhibit: exhibit,
      marketAuth: marketAuth,
      marketMint: liqMint,
      marketTokenFee: marketTokenFee,
      voucherMint: voucherMint,
      marketVoucher: marketTokens[0],
      marketSol: marketTokens[1],
      userVoucher: userVoucherWallet,
      userLiq: userTokenLiq,
      user: users[0].publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  let transaction = new Transaction().add(initialize_market_tx);
  let signature = await sendAndConfirmTransaction(connection, transaction, [
    users[0],
  ]);

  await connection.confirmTransaction(signature, "confirmed");
  console.log("Initialized Swap");
}

export async function instructionDepositLiquidity(nft: Nft) {
  let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(nft);
  let { marketAuth, shopAuthBump, marketTokens, liqMint } =
    await getShopAccounts(exhibit);

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    users[0].publicKey
  );
  let userTokenLiq = await getAssociatedTokenAddress(
    liqMint,
    users[0].publicKey
  );

  const deposit_liq_tx = await Shop.methods
    .depositLiquidity(new BN(liqAmounts[0]), shopAuthBump)
    .accounts({
      exhibit: exhibit,
      marketAuth: marketAuth,
      marketMint: liqMint,
      // marketTokenFee: marketTokenFee,
      voucherMint: voucherMint,
      marketVoucher: marketTokens[0],
      marketSol: marketTokens[1],
      userVoucher: userVoucherWallet,
      userLiq: userTokenLiq,
      user: users[0].publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  let transaction = new Transaction().add(deposit_liq_tx);

  let signature = await sendAndConfirmTransaction(connection, transaction, [
    users[0],
  ]);

  await connection.confirmTransaction(signature, "confirmed");
  console.log("Deposited Liquidity!");
}

export async function initializeCheckout(nft: Nft) {
  let matchedOrders: Keypair = Keypair.generate();

  let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

  let {
    matchedStorage,
    bidOrders,
    checkoutAuth,
    checkoutAuthBump,
    escrowSol,
    escrowVoucher,
  } = await getCheckoutAccounts(exhibit);

  let transaction = new Transaction();

  const init_create_tx = await SystemProgram.createAccount({
    fromPubkey: creator.publicKey,
    newAccountPubkey: matchedOrders.publicKey,
    space: 3610,
    lamports: await connection.getMinimumBalanceForRentExemption(3610),
    programId: CHECKOUT_PROGRAM_ID,
  });

  const init_checkout_tx = await Checkout.methods
    .initialize()
    .accounts({
      exhibit: exhibit,
      matchedStorage: matchedStorage,
      matchedOrders: matchedOrders.publicKey,
      bidOrders: bidOrders,
      checkoutAuth: checkoutAuth,
      voucherMint: voucherMint,
      escrowVoucher: escrowVoucher,
      escrowSol: escrowSol,
      user: creator.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      exhibitionProgram: EXHIBITION_PROGRAM_ID,
    })
    .transaction();

  transaction = transaction.add(init_create_tx);
  transaction = transaction.add(init_checkout_tx);

  let signature = await sendAndConfirmTransaction(connection, transaction, [
    creator,
    matchedOrders,
  ]);
  await connection.confirmTransaction(signature, "confirmed");

  console.log("Initialized checkout");
}

export async function makeBids(nft: Nft) {
  let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

  let { bidOrders, escrowSol } = await getCheckoutAccounts(exhibit);

  let bidPromises = [];

  let bids = [1, 2, 3, 4, 5, 5, 6, 6, 6, 7, 8, 9, 2, 3, 4, 5, 6, 6, 6];

  for (let i = 0; i < bids.length; i++) {
    let bid_tx = await Checkout.methods
      .makeBid(new BN(bids[i] * LAMPORTS_PER_SOL))
      .accounts({
        exhibit: exhibit,
        bidOrders: bidOrders,
        escrowSol: escrowSol,
        bidder: otherCreators[i % 2].publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    let transaction = new Transaction().add(bid_tx);

    let signature = sendAndConfirmTransaction(connection, transaction, [
      otherCreators[i % 2],
    ]);

    bidPromises.push(signature);

    console.log("added bid ", bids[i]);
  }

  await Promise.all(bidPromises);

  for (let promise in Promise) {
    await connection.confirmTransaction(promise, "confirmed");
  }

  await new Promise((r) => setTimeout(r, 1000));
  let account = await Checkout.account.bidOrders.fetch(bidOrders);

  for (let i = 0; i < 10; i++) {
    console.log(
      i,
      account.orderbook.items[i].bidderPubkey.toString(),
      account.orderbook.items[i].bidPrice,
      account.orderbook.items[i].sequenceNumber
    );
  }

  console.log("finsihed making bids");
}

async function initialFlow() {
  await airdropAndMint();

  await initializeExhibit(nftList[0][0]);
  await insertNft(nftList[0][0]);
  await insertNft(nftList[0][2]);
  await insertNft(nftList[0][6]);

  await initializeSwap(nftList[0][0]);
  await instructionDepositLiquidity(nftList[0][0]);

  await initializeCheckout(nftList[0][0]);
  await makeBids(nftList[0][0]);
}

initialFlow();
