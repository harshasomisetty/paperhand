import { Exhibition, IDL as EXHIBITION_IDL } from "../target/types/exhibition";
import { Shop, IDL as SHOP_IDL } from "../target/types/shop";
import { BN } from "bn.js";
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
  SHOP_PROGRAM_ID,
} from "../utils/constants";
import {
  getUserVoucherWallets,
  initAssociatedAddressIfNeeded,
  checkIfExhibitExists,
} from "../utils/actions";
import { getVoucherAddress, getSwapAccounts } from "../utils/accountDerivation";

const connection = new Connection("http://localhost:8899", "processed");

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

export async function insertNft(nft: Nft) {
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
export async function initializeSwap(exhibit: PublicKey) {
  console.log("in initialize swap");
  // create new user voucher token account outside of artifact insert
  let temp;

  let [
    voucherMint,
    marketAuth,
    authBump,
    marketTokens,
    userTokenVoucher,
    liqMint,
  ] = await getSwapAccounts(exhibit);

  let marketTokenFee = await getAssociatedTokenAddress(
    tokenMints[0],
    marketAuth,
    true
  );

  console.log("got pdas");

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
      user: user[0].publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([user[0]])
    .rpc();

  let transaction = new Transaction().add(deposit_liq_tx);
  console.log("about to send tx");
  let signature = await sendAndConfirmTransaction(connection, transaction, [
    user[0],
  ]);

  await connection.confirmTransaction(signature, "confirmed");
  console.log("made tx", transaction);
}
