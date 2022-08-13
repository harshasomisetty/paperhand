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
  AccountInfo,
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
  getShopAccounts,
  getCheckoutAccounts,
} from "../utils/accountDerivation";
import {
  getProvider,
  getUserVoucherWallets,
  initAssociatedAddressIfNeeded,
} from "../utils/actions";
import {
  CHECKOUT_PROGRAM_ID,
  creator,
  EXHIBITION_PROGRAM_ID,
  otherCreators,
  SHOP_PROGRAM_ID,
  users,
} from "../utils/constants";
import { mintNFTs } from "../utils/createNFTs";

interface Project {
  pubkey: PublicKey;
  account: AccountInfo<Buffer>;
}

import { Exhibition, IDL as EXHIBITION_IDL } from "../target/types/exhibition";
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

let nft;

//voucher wallets for both users
// nft token account
let nftUserTokenAccount;

export async function airdropAndMint() {
  let provider = await getProvider("http://localhost:8899", creator);

  Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);
  Checkout = new Program(CHECKOUT_IDL, CHECKOUT_PROGRAM_ID, provider);

  let airdropVal = 150 * LAMPORTS_PER_SOL;

  let airdropees = [...otherCreators, ...users, creator];
  await airdropAll(airdropees, airdropVal, connection);

  let mOrderBal = await connection.getBalance(creator.publicKey);
  console.log("ardrop bal", mOrderBal);
  nftList = await mintNFTs(
    mintNumberOfNfts,
    mintNumberOfCollections,
    metaplex,
    connection
  );

  console.log("minted all nfts!");
}

export async function initializeExhibit() {
  console.log("inside of init exhibit");

  nft = nftList[0][0];
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
  console.log("initialized exhibit!", exhibitInfo.exhibitSymbol);
}

export async function initializeCheckout() {
  console.log("in initialize checkout");
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
      exhibitionProgram: Exhibition.programId,
    })
    .transaction();

  transaction = transaction.add(init_create_tx);
  transaction = transaction.add(init_checkout_tx);

  let signature = await sendAndConfirmTransaction(connection, transaction, [
    creator,
    matchedOrders,
  ]);
  await connection.confirmTransaction(signature, "confirmed");

  let matchedOrdersInfo = await connection.getAccountInfo(
    matchedStorage,
    "confirmed"
  );

  // let matchedOrdersInfo = await Checkout.account.matchedStorage.fetch(
  //   matchedStorage
  // );

  console.log("snaity info obj?", matchedOrdersInfo);
  console.log("address as well", matchedStorage.toString());
  console.log("matched order", matchedOrders.publicKey.toString());
  console.log("initialized checkout");
}

export async function makeBids() {
  console.log("in make bids");

  let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

  let {
    matchedStorage,
    bidOrders,
    checkoutAuth,
    checkoutAuthBump,
    escrowSol,
    escrowVoucher,
  } = await getCheckoutAccounts(exhibit);

  let preHeapBal = await connection.getBalance(escrowSol);
  console.log("pre bal", preHeapBal);
  let bidPromises = [];
  console.log("about to start bids");
  for (let i = 0; i < 10; i++) {
    let bid_tx = await Checkout.methods
      .makeBid(new BN((i + 1) * LAMPORTS_PER_SOL))
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

    console.log("added bid ", i);
  }
  for (let i = 3; i < 7; i++) {
    let bid_tx = await Checkout.methods
      .makeBid(new BN((i + 1) * LAMPORTS_PER_SOL))
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

    console.log("added bid ", i);
  }

  await Promise.all(bidPromises);

  for (let promise in Promise) {
    await connection.confirmTransaction(promise, "confirmed");
  }

  await new Promise((r) => setTimeout(r, 3000));
  let account = await Checkout.account.bidOrders.fetch(bidOrders);

  for (let i = 0; i < 10; i++) {
    console.log(
      i,
      account.heap.items[i].bidderPubkey.toString(),
      account.heap.items[i].bidPrice,
      account.heap.items[i].sequenceNumber
    );
  }

  console.log("finsihed making 10 bids`");
}

async function initialFlow() {
  await airdropAndMint();
  console.log("outside of init exhibit");
  await initializeExhibit();
  await initializeCheckout();
  await makeBids();
}
initialFlow();
