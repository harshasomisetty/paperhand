import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  Nft,
} from "@metaplex-foundation/js";
import { BN, Program } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
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
  getCarnivalAccounts,
} from "../utils/accountDerivation";
import {
  checkIfAccountExists,
  getProvider,
  initAssociatedAddressIfNeeded,
} from "../utils/actions";
import {
  ABC_URIS,
  APE_URIS,
  BEAR_URIS,
  CARNIVAL_PROGRAM_ID,
  CHECKOUT_PROGRAM_ID,
  creator,
  EXHIBITION_PROGRAM_ID,
  GOD_URIS,
  otherCreators,
  SHOP_PROGRAM_ID,
  users,
} from "../utils/constants";
import { mintNFTs } from "../utils/createNFTs";

import { IDL as EXHIBITION_IDL, Exhibition } from "../target/types/exhibition";
import { IDL as SHOP_IDL, Shop } from "../target/types/shop";
import { IDL as CHECKOUT_IDL, Checkout } from "../target/types/checkout";
import { IDL as CARNIVAL_IDL, Carnival } from "../target/types/carnival";
import { airdropAll } from "../utils/helpfulFunctions";
import {
  createCarnival,
  createCarnivalMarket,
} from "../utils/carnival_actions";
const connection = new Connection("http://localhost:8899", "processed");

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(creator))
  .use(bundlrStorage());

let nftList: Nft[][] = [];

let Exhibition;
let Shop;
let Checkout;
let Carnival;

export async function airdropAndMint() {
  let provider = await getProvider("http://localhost:8899", creator);

  Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);
  Checkout = new Program(CHECKOUT_IDL, CHECKOUT_PROGRAM_ID, provider);
  Shop = new Program(SHOP_IDL, SHOP_PROGRAM_ID, provider);
  Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);

  let airdropVal = 150 * LAMPORTS_PER_SOL;

  let airdropees = [...otherCreators, ...users, creator];
  await airdropAll(airdropees, airdropVal, connection);

  nftList.push(
    await mintNFTs(metaplex, connection, APE_URIS, otherCreators[0], [
      users[0].publicKey,
      users[1].publicKey,
    ])
  );
  nftList.push(
    await mintNFTs(metaplex, connection, BEAR_URIS, otherCreators[1], [
      users[0].publicKey,
      users[1].publicKey,
    ])
  );
  nftList.push(
    await mintNFTs(metaplex, connection, GOD_URIS, otherCreators[0], [
      users[0].publicKey,
    ])
  );
  nftList.push(
    await mintNFTs(metaplex, connection, ABC_URIS, otherCreators[1], [
      users[1].publicKey,
    ])
  );

  console.log("Minted all nfts!");
}

export async function insertNft(nft: Nft, signer: Keypair) {
  let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(nft);
  let transaction = new Transaction();

  if (!(await checkIfAccountExists(exhibit, connection))) {
    const init_tx = await Exhibition.methods
      .initializeExhibit()
      .accounts({
        exhibit: exhibit,
        voucherMint: voucherMint,
        nftMetadata: nft.metadataAccount.publicKey,
        signer: signer.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction = transaction.add(init_tx);

    console.log("initing exhibit");
  }

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint!,
    signer.publicKey
  );

  if (!(await checkIfAccountExists(userVoucherWallet, connection))) {
    let voucher_tx = createAssociatedTokenAccountInstruction(
      signer.publicKey,
      userVoucherWallet,
      signer.publicKey,
      voucherMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    transaction = transaction.add(voucher_tx);
  }

  let nftUserTokenAccount = await getAssociatedTokenAddress(
    nft.mint,
    signer.publicKey
  );

  let insert_nft_tx = await Exhibition.methods
    .artifactInsert()
    .accounts({
      exhibit: exhibit,
      voucherMint: voucherMint,
      userVoucherWallet: userVoucherWallet,
      nftMint: nft.mint,
      nftMetadata: nft.metadataAccount.publicKey,
      nftUserToken: nftUserTokenAccount,
      nftArtifact: nftArtifact,
      delegateSigner: signer.publicKey,
      signer: signer.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  transaction = transaction.add(insert_nft_tx);

  let signature = await sendAndConfirmTransaction(connection, transaction, [
    signer,
  ]);

  await connection.confirmTransaction(signature, "confirmed");

  console.log("Inserted NFT! Artifact bal, userVoucherBal");
}

async function initializeSwap(nft: Nft, user: Keypair, initAmounts: number[]) {
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
    user.publicKey
  );

  let userTokenLiq = await getAssociatedTokenAddress(liqMint, user.publicKey);

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
      user: user.publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  let transaction = new Transaction().add(initialize_market_tx);
  let signature = await sendAndConfirmTransaction(connection, transaction, [
    user,
  ]);

  await connection.confirmTransaction(signature, "confirmed");
  console.log("Initialized Swap");
}

export async function instructionDepositLiquidity(
  nft: Nft,
  user: Keypair,
  liqAmounts: number[]
) {
  let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(nft);
  let { marketAuth, shopAuthBump, marketTokens, liqMint } =
    await getShopAccounts(exhibit);

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    user.publicKey
  );
  let userTokenLiq = await getAssociatedTokenAddress(liqMint, user.publicKey);

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
      user: user.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  let transaction = new Transaction().add(deposit_liq_tx);

  let signature = await sendAndConfirmTransaction(connection, transaction, [
    user,
  ]);

  await connection.confirmTransaction(signature, "confirmed");
  console.log("Deposited Liquidity!");
}

export async function initializeCheckout(nft: Nft, user: Keypair) {
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
    fromPubkey: user.publicKey,
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
      user: user.publicKey,
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
    user,
    matchedOrders,
  ]);
  await connection.confirmTransaction(signature, "confirmed");

  console.log("Initialized checkout");
}

export async function makeBids(nft: Nft, users: Keypair[]) {
  let { exhibit } = await getNftDerivedAddresses(nft);

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
        bidder: users[i % 2].publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    let transaction = new Transaction().add(bid_tx);

    let signature = sendAndConfirmTransaction(connection, transaction, [
      users[i % 2],
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

export async function initCarnivalAndMarket(
  nfts: Nft[],
  solAmt: number,
  users: Keypair[]
) {
  let transaction: Transaction;
  let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
    nfts[0]
  );
  let { carnival, carnivalAuth, carnivalAuthBump, escrowSol } =
    await getCarnivalAccounts(exhibit);

  // transaction = await createCarnival(connection, nfts[0], users[0].publicKey);

  let initCarnTx = await Carnival.methods
    .initializeCarnival()
    .accounts({
      exhibit: exhibit,
      carnival: carnival,
      carnivalAuth: carnivalAuth,
      voucherMint: voucherMint,
      nftMetadata: nfts[0].metadataAccount.publicKey,
      escrowSol: escrowSol,
      signer: users[0].publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
      exhibitionProgram: Exhibition.programId,
    })
    .transaction();

  transaction = transaction.add(initCarnTx);

  console.log("about to send create carnival tx", transaction);

  connection.confirmTransaction(
    await sendAndConfirmTransaction(connection, transaction, [users[0]]),
    "confirmed"
  );

  let marketId = 0;

  transaction = await createCarnivalMarket(
    connection,
    users[0].publicKey,
    nfts,
    solAmt,
    marketId
  );

  connection.confirmTransaction(
    await sendAndConfirmTransaction(connection, transaction, [users[0]]),
    "confirmed"
  );
}

async function initialFlow() {
  // 1) start by showing off exhibition creation by depositing into exhibit for ABC
  await airdropAndMint();

  // 2) go into ape shop to demonstrate trading
  await insertNft(nftList[0][0], users[0]);
  await insertNft(nftList[0][2], users[0]);
  await insertNft(nftList[0][4], users[0]);
  await insertNft(nftList[0][6], users[0]);
  await initializeSwap(nftList[0][0], users[0], [2, 6]);
  await instructionDepositLiquidity(nftList[0][0], users[0], [1]);

  // 3) go into BEAR exhibit to demonstrate floorbid
  await insertNft(nftList[1][0], users[0]);
  await initializeCheckout(nftList[0][0], users[0]);
  await makeBids(nftList[0][0], [users[0], users[1]]);

  // 4) go into gods to demonstrate carnival
  await insertNft(nftList[2][0], users[0]);

  let nfts = [
    nftList[2][1],
    nftList[2][2],
    nftList[2][3],
    nftList[2][4],
    nftList[2][5],
  ];

  await initCarnivalAndMarket(nfts, 2 * LAMPORTS_PER_SOL, [users[0]]);
}

initialFlow();
