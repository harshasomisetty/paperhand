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
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  getExhibitAccounts,
  getSwapAccounts,
  getVoucherAddress,
} from "../utils/accountDerivation";
import {
  getProvider,
  getUserVoucherWallets,
  initAssociatedAddressIfNeeded,
} from "../utils/actions";
import {
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
import { IDL as SHOP_IDL, Shop } from "../target/types/shop";
import { airdropAll } from "../utils/helpfulFunctions";
const connection = new Connection("http://localhost:8899", "processed");

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(creator))
  .use(bundlrStorage());

let mintNumberOfCollections = 2;
let mintNumberOfNfts = 10;
let nftList: Nft[][] = Array(mintNumberOfCollections);

let Exhibition;
let Shop;

let nft;
let nft2;
let nft3;
let exhibit, voucherMint;
//voucher wallets for both users
let userVoucherWallet;
// nft token account
let nftUserTokenAccount;

// market pda
let marketAuth;
let authBump;

// swap init amounts
let initAmounts = [2, 6];
let liqAmounts = [1];
let swapAmount = [1];
// mint accounts, 0 is liquidity, array to be able to copy over code
let tokenMints = new Array(1);
// shop's token accounts, 0 is voucher account, 1 is sol account, 2 is
let marketTokens = new Array(2);
// user 0's tokens, token 0 is liquidity account, token 1 is voucher account
let userTokens = new Array(2);

export async function airdropAndMint() {
  let provider = await getProvider("http://localhost:8899", creator);

  Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);
  Shop = new Program(SHOP_IDL, SHOP_PROGRAM_ID, provider);

  let airdropVal = 20 * LAMPORTS_PER_SOL;

  let airdropees = [creator, ...otherCreators, ...users];
  await airdropAll(airdropees, airdropVal, connection);

  nftList = await mintNFTs(
    mintNumberOfNfts,
    mintNumberOfCollections,
    metaplex,
    connection
  );

  console.log("minted all nfts!");
}

export async function initializeExhibit() {
  nft = nftList[0][0];
  nft2 = nftList[0][2];
  nft3 = nftList[0][6];
  [exhibit, voucherMint] = await getVoucherAddress(nft);

  const tx = await Exhibition.methods
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

  let transaction = new Transaction().add(tx);

  let signature = await sendAndConfirmTransaction(connection, transaction, [
    creator,
  ]);
  await connection.confirmTransaction(signature, "confirmed");
  let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
  console.log("initialized exhibit!", exhibitInfo.exhibitSymbol);
}

export async function insertNft(nft: Nft) {
  let [nftArtifact] = await PublicKey.findProgramAddress(
    [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  userVoucherWallet = await getUserVoucherWallets(voucherMint, users);
  nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    users[0],
    nft.mint,
    users[0].publicKey
  );

  // create new user voucher token account outside of artifact insert
  await initAssociatedAddressIfNeeded(
    connection,
    userVoucherWallet[0],
    voucherMint,
    users[0]
  );

  let tx = await Exhibition.methods
    .artifactInsert()
    .accounts({
      exhibit: exhibit,
      voucherMint: voucherMint,
      userVoucherWallet: userVoucherWallet[0],
      nftMint: nft.mint,
      nftMetadata: nft.metadataAccount.publicKey,
      nftUserToken: nftUserTokenAccount.address,
      nftArtifact: nftArtifact,
      user: users[0].publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  let transaction = new Transaction().add(tx);

  let signature = await sendAndConfirmTransaction(connection, transaction, [
    users[0],
  ]);

  await connection.confirmTransaction(signature, "confirmed");
  let postNftArtifactBal = await getAccount(connection, nftArtifact);

  let postUserVoucherTokenBal = await getAccount(
    connection,
    userVoucherWallet[0]
  );

  console.log(
    "Inserted NFT! artifact bal, userVoucherBal",
    postNftArtifactBal.amount,
    Number(postUserVoucherTokenBal)
  );
}
async function initializeSwap() {
  console.log("in initialize swap");
  // create new user voucher token account outside of artifact insert
  console.log("got pdas");

  let [marketAuth, authBump, marketTokens, liqMint] = await getExhibitAccounts(
    exhibit
  );

  let marketTokenFee = await getAssociatedTokenAddress(
    liqMint,
    marketAuth,
    true
  );

  userTokens[0] = await getAssociatedTokenAddress(
    tokenMints[0],
    users[0].publicKey
  );

  userTokens[1] = await getAssociatedTokenAddress(
    voucherMint,
    users[0].publicKey
  );

  console.log("auth", marketAuth.toString());
  console.log("market mint", tokenMints[0].toString());
  try {
    let userTokenVoucherBal = await getAccount(connection, userTokens[1]);

    console.log(
      "user voucher",
      Number(userTokenVoucherBal.amount),
      initAmounts[0]
    );

    console.log("making tx");
    const tx = await Shop.methods
      .initializeMarket(
        new BN(initAmounts[0]),
        new BN(initAmounts[1] * LAMPORTS_PER_SOL),
        authBump
      )
      .accounts({
        exhibit: exhibit,
        marketAuth: marketAuth,
        marketMint: liqMint,
        marketTokenFee: marketTokenFee,
        voucherMint: voucherMint,
        marketVoucher: marketTokens[0],
        marketSol: marketTokens[1],
        userVoucher: userTokens[1],
        userLiq: userTokens[0],
        user: users[0].publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([users[0]])
      .rpc();

    let transaction = new Transaction().add(tx);
    console.log("about to send tx");
    let signature = await sendAndConfirmTransaction(connection, transaction, [
      users[0],
    ]);

    await connection.confirmTransaction(signature, "confirmed");
    console.log("inited market");
  } catch (error) {
    console.log("failed init", error);
  }
}

export async function instructionDepositLiquidity() {
  console.log("in instruction dpeo");

  const deposit_liq_tx = await Shop.methods
    .depositLiquidity(new BN(liqAmounts[0]), authBump)
    .accounts({
      exhibit: exhibit,
      marketAuth: marketAuth,
      marketMint: tokenMints[0],
      // marketTokenFee: marketTokenFee,
      voucherMint: voucherMint,
      marketVoucher: marketTokens[0],
      marketSol: marketTokens[1],
      userVoucher: userTokens[1],
      userLiq: userTokens[0],
      user: users[0].publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([users[0]])
    .rpc();

  let transaction = new Transaction().add(deposit_liq_tx);
  console.log("about to send tx");
  let signature = await sendAndConfirmTransaction(connection, transaction, [
    users[0],
  ]);

  await connection.confirmTransaction(signature, "confirmed");
  console.log("made tx", transaction);
}
async function initialFlow() {
  await airdropAndMint();
  await initializeExhibit();

  await insertNft(nft);
  await insertNft(nft2);
  await insertNft(nft3);
  await initializeSwap();
  await instructionDepositLiquidity();
}
initialFlow();
