import { Nft } from "@metaplex-foundation/js";
import { BN, Wallet } from "@project-serum/anchor";
import {
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  BAZAAR_PROGRAM_ID,
  decimalsVal,
  EXHIBITION_PROGRAM_ID,
  getBazaarProgramAndProvider,
  getExhibitProgramAndProvider,
} from "@/utils/constants";
import {
  checkIfExhibitExists,
  getExhibitAddress,
  getSwapAccounts,
} from "@/utils/retrieveData";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

async function manualSendTransaction(
  transaction: Transaction,
  publicKey: PublicKey,
  connection: Connection,
  signTransaction: any
) {
  transaction.feePayer = publicKey;
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash("finalized")
  ).blockhash;

  transaction = await signTransaction(transaction);

  const rawTransaction = transaction.serialize();
  console.log("raw tx", rawTransaction);
  let signature = await connection.sendRawTransaction(rawTransaction);
  console.log("sent raw, waiting");
  await connection.confirmTransaction(signature, "confirmed");
  console.log("sent tx!!!");
}
export async function instructionDepositNft(
  wallet: Wallet,
  publicKey: PublicKey,
  signTransaction: any,
  nft: Nft,
  connection: Connection
) {
  let { Exhibition } = await getExhibitProgramAndProvider(wallet);
  await nft.metadataTask.run();

  let [exhibit, voucherMint] = await getExhibitAddress(nft);

  let [nftArtifact] = await PublicKey.findProgramAddress(
    [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

  let nftUserTokenAccount = await getAssociatedTokenAddress(
    nft.mint,
    publicKey
  );

  let transaction = new Transaction();

  let exhibitExists = await checkIfExhibitExists(nft, connection);
  if (!exhibitExists) {
    const init_tx = await Exhibition.methods
      .initializeExhibit()
      .accounts({
        exhibit: exhibit,
        voucherMint: voucherMint,
        nftMetadata: nft.metadataAccount.publicKey,
        creator: publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction = transaction.add(init_tx);

    console.log("initing exhibit");
  }
  let bal = await connection.getBalance(userVoucherWallet);
  if (bal == 0) {
    let voucher_tx = createAssociatedTokenAccountInstruction(
      publicKey,
      userVoucherWallet,
      publicKey,
      voucherMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    transaction = transaction.add(voucher_tx);
  } else {
    console.log("user voucher already created");
  }

  let insert_tx = await Exhibition.methods
    .artifactInsert()
    .accounts({
      exhibit: exhibit,
      voucherMint: voucherMint,
      userVoucherWallet: userVoucherWallet,
      nftMint: nft.mint,
      nftMetadata: nft.metadataAccount.publicKey,
      nftUserToken: nftUserTokenAccount,
      nftArtifact: nftArtifact,
      user: publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  transaction = transaction.add(insert_tx);
  await manualSendTransaction(
    transaction,
    publicKey,
    connection,
    signTransaction
  );
  console.log("deposited nft");
}

export async function instructionWithdrawNft(
  wallet: Wallet,
  publicKey: PublicKey,
  signTransaction: any,
  nft: Nft,
  connection: Connection
) {
  let { Exhibition } = await getExhibitProgramAndProvider(wallet);
  await nft.metadataTask.run();

  let [exhibit, voucherMint] = await getExhibitAddress(nft);

  let [nftArtifact] = await PublicKey.findProgramAddress(
    [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

  let nftUserTokenAccount = await getAssociatedTokenAddress(
    nft.mint,
    publicKey
  );

  let transaction = new Transaction();

  let withdraw_tx = await Exhibition.methods
    .artifactWithdraw()
    .accounts({
      exhibit: exhibit,
      voucherMint: voucherMint,
      userVoucherWallet: userVoucherWallet,
      nftMint: nft.mint,
      nftMetadata: nft.metadataAccount.publicKey,
      nftUserToken: nftUserTokenAccount,
      nftArtifact: nftArtifact,
      user: publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .transaction();

  transaction = transaction.add(withdraw_tx);

  await manualSendTransaction(
    transaction,
    publicKey,
    connection,
    signTransaction
  );
  console.log("Withdrew nft!");
}

export async function instructionInitSwap(
  wallet: Wallet,
  publicKey: PublicKey,
  exhibit: PublicKey,
  solIn: number,
  voucherIn: number,
  signTransaction: any,
  connection: Connection
) {
  console.log("in instruction", solIn, voucherIn);
  let { Bazaar } = await getBazaarProgramAndProvider(wallet);

  let [voucherMint, marketAuth, authBump, marketTokens, userTokenVoucher] =
    await getSwapAccounts(exhibit, publicKey);

  let temp;
  let tokenMints = new Array(1);

  [tokenMints[0], temp] = await PublicKey.findProgramAddress(
    [Buffer.from("market_token_mint"), marketAuth.toBuffer()],
    BAZAAR_PROGRAM_ID
  );

  let marketTokenFee = await getAssociatedTokenAddress(
    tokenMints[0],
    marketAuth,
    true
  );

  let userTokenLiq = await getAssociatedTokenAddress(tokenMints[0], publicKey);

  const init_tx = await Bazaar.methods
    .initializeMarket(new BN(voucherIn), new BN(solIn), authBump)
    .accounts({
      exhibit: exhibit,
      marketAuth: marketAuth,
      marketMint: tokenMints[0],
      marketTokenFee: marketTokenFee,
      voucherMint: voucherMint,
      marketVoucher: marketTokens[0],
      marketSol: marketTokens[1],
      userVoucher: userTokenVoucher,
      userLiq: userTokenLiq,
      user: publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  let transaction = new Transaction().add(init_tx);
  try {
    await manualSendTransaction(
      transaction,
      publicKey,
      connection,
      signTransaction
    );
  } catch (error) {
    console.log("initing error", error);
  }
}

export async function instructionSwap(
  wallet: Wallet,
  publicKey: PublicKey,
  exhibit: PublicKey,
  amountIn: number,
  minAmountOut: number,
  forward: boolean,
  signTransaction: any,
  connection: Connection
) {
  let { Bazaar } = await getBazaarProgramAndProvider(wallet);

  let [voucherMint, marketAuth, authBump, marketTokens, userTokenVoucher] =
    await getSwapAccounts(exhibit, publicKey);

  let transaction = new Transaction();
  console.log(
    "amounts in/out",
    amountIn * decimalsVal,
    minAmountOut * LAMPORTS_PER_SOL
  );
  let swapAmount;
  if (forward) {
    console.log("from voucher to sol");
    swapAmount = [amountIn * decimalsVal, minAmountOut * LAMPORTS_PER_SOL];
  } else {
    console.log("from sol to voucher");
    swapAmount = [amountIn * LAMPORTS_PER_SOL, minAmountOut * decimalsVal];
  }
  console.log("swap amounts", swapAmount);
  const swap_tx = await Bazaar.methods
    .swap(new BN(swapAmount[0]), new BN(swapAmount[1]), forward, authBump)
    .accounts({
      exhibit: exhibit,
      marketAuth: marketAuth,
      // marketTokenFee: marketTokenFee,
      voucherMint: voucherMint,
      marketVoucher: marketTokens[0],
      marketSol: marketTokens[1],
      userVoucher: userTokenVoucher,
      user: publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();
  transaction = transaction.add(swap_tx);
  try {
    await manualSendTransaction(
      transaction,
      publicKey,
      connection,
      signTransaction
    );
  } catch (error) {
    console.log("phantom send tx", error);
  }
}

export async function instructionDepositLiquidity(
  wallet: Wallet,
  publicKey: PublicKey,
  exhibit: PublicKey,
  liqAmount: number,
  signTransaction: any,
  connection: Connection
) {
  console.log("in instruction dpeo");
  let { Bazaar } = await getBazaarProgramAndProvider(wallet);

  let [voucherMint, marketAuth, authBump, marketTokens, userTokenVoucher] =
    await getSwapAccounts(exhibit, publicKey);

  let tokenMints = new Array(1);
  let temp;
  [tokenMints[0], temp] = await PublicKey.findProgramAddress(
    [Buffer.from("market_token_mint"), marketAuth.toBuffer()],
    BAZAAR_PROGRAM_ID
  );

  let userTokenLiq = await getAssociatedTokenAddress(tokenMints[0], publicKey);

  let transaction = new Transaction();
  const deposit_liq_tx = await Bazaar.methods
    .depositLiquidity(new BN(liqAmount * decimalsVal), authBump)
    .accounts({
      exhibit: exhibit,
      marketAuth: marketAuth,
      marketMint: tokenMints[0],
      // marketTokenFee: marketTokenFee,
      voucherMint: voucherMint,
      marketVoucher: marketTokens[0],
      marketSol: marketTokens[1],
      userVoucher: userTokenVoucher,
      userLiq: userTokenLiq,
      user: publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();
  transaction = transaction.add(deposit_liq_tx);
  console.log("made tx", transaction);
  try {
    await manualSendTransaction(
      transaction,
      publicKey,
      connection,
      signTransaction
    );
  } catch (error) {
    console.log("phantom send tx", error);
  }
}
