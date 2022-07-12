import { mintNFTs } from "../utils/createNFTs";

import {
  bundlrStorage,
  findMetadataPda,
  keypairIdentity,
  Metaplex,
  BundlrStorageDriver,
  Nft,
} from "@metaplex-foundation/js";
import { Program } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
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
  creator,
  otherCreators,
  user,
  EXHIBITION_PROGRAM_ID,
  BAZAAR_PROGRAM_ID,
} from "../utils/constants";
import {
  getExhibitAddress,
  getProvider,
  getUserVoucherWallets,
  initAssociatedAddressIfNeeded,
  checkIfExhibitExists,
} from "../utils/actions";

import { getOwnedNfts } from "../utils/createNFTs";
interface Project {
  pubkey: PublicKey;
  account: AccountInfo<Buffer>;
}

import { Exhibition, IDL as EXHIBITION_IDL } from "../target/types/exhibition";
import { Bazaar, IDL as BAZAAR_IDL } from "../target/types/bazaar";
import { BN } from "bn.js";
const connection = new Connection("http://localhost:8899", "processed");

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(creator))
  .use(bundlrStorage());

let mintNumberOfCollections = 2;
let mintNumberOfNfts = 5;
let nftList: Nft[][] = Array(mintNumberOfCollections);

let Exhibition;
let Bazaar;

let nft;
let exhibit, voucherMint;
//voucher wallets for both users
let userVoucherWallet;
// nft token account
let nftUserTokenAccount;

// market pda
let marketAuth;
let authBump;
// mint decimals for swap
let decimals = 9;
let decimalsVal = Math.pow(10, decimals);

// swap init amounts
let initAmounts = [0.5 * decimalsVal, 10 * LAMPORTS_PER_SOL];
let swapAmount = [0.5 * decimalsVal, 3 * LAMPORTS_PER_SOL];
// mint accounts, 0 is liquidity, array to be able to copy over code
let tokenMints = new Array(1);
// bazaar's token accounts, 0 is voucher account, 1 is sol account, 2 is
let marketTokens = new Array(2);
// user 0's tokens, token 0 is liquidity account, token 1 is voucher account
let userTokens = new Array(2);

async function airdropAndMint() {
  let provider = await getProvider("http://localhost:8899", creator);
  console.log("Prog id", EXHIBITION_PROGRAM_ID.toString());
  Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);
  Bazaar = new Program(BAZAAR_IDL, BAZAAR_PROGRAM_ID, provider);
  let airdropees = [creator, ...otherCreators, ...user];
  for (const dropee of airdropees) {
    await connection.confirmTransaction(
      await connection.requestAirdrop(dropee.publicKey, 20 * LAMPORTS_PER_SOL),
      "confirmed"
    );
  }

  console.log("minting nfts...");
  nftList = await mintNFTs(
    mintNumberOfNfts,
    mintNumberOfCollections,
    metaplex,
    connection
  );
  console.log("minted all nfts!");
}

async function initializeExhibit() {
  nft = nftList[0][0];
  [exhibit, voucherMint] = await getExhibitAddress(nft);

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

async function insertNft() {
  let [nftArtifact] = await PublicKey.findProgramAddress(
    [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  userVoucherWallet = await getUserVoucherWallets(voucherMint, user);
  nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    user[0],
    nft.mint,
    user[0].publicKey
  );

  // create new user voucher token account outside of artifact insert
  await initAssociatedAddressIfNeeded(
    connection,
    userVoucherWallet[0],
    voucherMint,
    user[0]
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
      user: user[0].publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  let transaction = new Transaction().add(tx);

  let signature = await sendAndConfirmTransaction(connection, transaction, [
    user[0],
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

async function getAllExhibitions() {
  let allExhibitAccounts = await connection.getProgramAccounts(
    EXHIBITION_PROGRAM_ID
  );
  allExhibitAccounts.forEach((key) => {
    console.log("exhibits", key.pubkey.toString());
  });
}

async function getAllNfts() {
  let exhibitBal = await connection.getBalance(exhibit);
  if (exhibitBal > 0) {
    console.log("exhibit exists");
    let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);

    console.log("exhibit info", exhibitInfo.exhibitSymbol);
    let allArtifactAccounts: Project[] = (
      await connection.getTokenAccountsByOwner(exhibit, {
        programId: TOKEN_PROGRAM_ID,
      })
    ).value;

    let artifactMints = [];
    for (let i = 0; i < allArtifactAccounts.length; i++) {
      let key = allArtifactAccounts[i].pubkey;

      let tokenAccount = await getAccount(connection, key);
      artifactMints.push(tokenAccount.mint);
    }

    console.log("setting nfts");
    let allNFTs = await metaplex.nfts().findAllByMintList(artifactMints);
    console.log(allNFTs.length);
  }
}

async function initializeSwap() {
  console.log("in initialize swap");
  // create new user voucher token account outside of artifact insert
  let temp;

  [marketAuth, authBump] = await PublicKey.findProgramAddress(
    [Buffer.from("market_auth"), exhibit.toBuffer()],
    BAZAAR_PROGRAM_ID
  );

  [tokenMints[0], temp] = await PublicKey.findProgramAddress(
    [Buffer.from("market_token_mint"), marketAuth.toBuffer()],
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

  console.log("got pdas");
  let marketTokenFee = await getAssociatedTokenAddress(
    tokenMints[0],
    marketAuth,
    true
  );

  userTokens[0] = await getAssociatedTokenAddress(
    tokenMints[0],
    user[0].publicKey
  );

  userTokens[1] = await getAssociatedTokenAddress(
    voucherMint,
    user[0].publicKey
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
    const tx = await Bazaar.methods
      .initializeMarket(
        new BN(initAmounts[0]),
        new BN(initAmounts[1]),
        authBump
      )
      .accounts({
        exhibit: exhibit,
        marketAuth: marketAuth,
        marketMint: tokenMints[0],
        marketTokenFee: marketTokenFee,
        tokenVoucherMint: voucherMint,
        marketTokenVoucher: marketTokens[0],
        marketTokenSol: marketTokens[1],
        userTokenVoucher: userTokens[1],
        userTokenLiq: userTokens[0],
        user: user[0].publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user[0]])
      .rpc();

    let transaction = new Transaction().add(tx);
    console.log("about to send tx");
    let signature = await sendAndConfirmTransaction(connection, transaction, [
      user[0],
    ]);

    await connection.confirmTransaction(signature, "confirmed");
    console.log("inited market");
  } catch (error) {
    console.log("failed init", error);
  }
}

async function quickSwap() {
  try {
    const tx = await Bazaar.methods
      .swap(new BN(swapAmount[0]), new BN(swapAmount[1]), true, authBump)
      .accounts({
        exhibit: exhibit,
        marketAuth: marketAuth,
        // marketTokenFee: marketTokenFee,
        tokenVoucherMint: voucherMint,
        marketTokenVoucher: marketTokens[0],
        marketTokenSol: marketTokens[1],
        userTokenVoucher: userTokens[1],
        user: user[0].publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user[0]])
      .rpc();
  } catch (error) {
    console.log("fuck swap", error);
  }
}
// getAllExhibitions();
async function fullFlow() {
  await airdropAndMint();
  await initializeExhibit();
  await insertNft();
  await initializeSwap();
  // await quickSwap();
  // await getAllNfts();
}
fullFlow();

async function printAdds() {
  console.log(creator.publicKey.toString());
  console.log("user 1", user[0].publicKey.toString());
  console.log("user 2", user[1].publicKey.toString());
  console.log("other creator 1", otherCreators[0].publicKey.toString());
  console.log("other creator 2", otherCreators[1].publicKey.toString());
}

// printAdds();

// getOwnedNfts(
//   new PublicKey("BAxBxozdGCQcGMrK31fKpGRGf69Uk7ipE3JpzYsvHuUZ"),
//   metaplex
// );

async function printVoucherTokenBal() {
  let exhibit = new PublicKey("CrSR2a8nDcTFUoEkmDpdF1TtjuBqcbY73zDARFBD45nM");
  let [voucherMint] = await PublicKey.findProgramAddress(
    [Buffer.from("voucher_mint"), exhibit.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    user[0].publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  let postUserVoucherTokenBal = await getAccount(connection, userVoucherWallet);
  console.log("voucher bal", Number(postUserVoucherTokenBal.amount));
}

// printVoucherTokenBal();
