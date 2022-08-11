import {
  BAZAAR_PROGRAM_ID,
  EXHIBITION_PROGRAM_ID,
  getBazaarProgramAndProvider,
  getExhibitProgramAndProvider,
} from "@/utils/constants";
import {
  checkIfAccountExists,
  checkIfExhibitExists,
  getExhibitAddress,
  getSwapAccounts,
} from "@/utils/retrieveData";
import { Nft } from "@metaplex-foundation/js";
import { BN, Wallet } from "@project-serum/anchor";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
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

  if (!(await checkIfExhibitExists(nft, connection))) {
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

  if (!(await checkIfAccountExists(userVoucherWallet, connection))) {
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

  if (!(await checkIfAccountExists(nftUserTokenAccount, connection))) {
    let voucher_tx = createAssociatedTokenAccountInstruction(
      publicKey,
      nftUserTokenAccount,
      publicKey,
      nft.mint
    );
    transaction = transaction.add(voucher_tx);
  } else {
    console.log("user voucher already created");
  }

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

  let [
    voucherMint,
    marketAuth,
    authBump,
    marketTokens,
    userTokenVoucher,
    liqMint,
  ] = await getSwapAccounts(exhibit, publicKey);

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

  let transaction = new Transaction();

  const init_tx = await Bazaar.methods
    .initializeMarket(
      new BN(voucherIn),
      new BN(solIn * LAMPORTS_PER_SOL),
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
      userVoucher: userTokenVoucher,
      userLiq: userTokenLiq,
      user: publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  transaction = transaction.add(init_tx);
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
  vouchers: number,
  buyVouchers: boolean,
  signTransaction: any,
  connection: Connection
) {
  let { Bazaar } = await getBazaarProgramAndProvider(wallet);

  let { Exhibition } = await getExhibitProgramAndProvider(wallet);

  let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
  console.log(exhibitInfo.creator.toString());

  let [
    voucherMint,
    marketAuth,
    authBump,
    marketTokens,
    userTokenVoucher,
    liqMint,
  ] = await getSwapAccounts(exhibit, publicKey);

  let transaction = new Transaction();

  if (!(await checkIfAccountExists(userTokenVoucher, connection))) {
    let voucher_tx = createAssociatedTokenAccountInstruction(
      publicKey,
      userTokenVoucher,
      publicKey,
      voucherMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    transaction = transaction.add(voucher_tx);
  } else {
    console.log("user voucher already created");
  }

  console.log("swap amounts", vouchers, buyVouchers);
  const swap_tx = await Bazaar.methods
    .swap(new BN(vouchers), buyVouchers, authBump)
    .accounts({
      exhibit: exhibit,
      marketAuth: marketAuth,
      // marketTokenFee: marketTokenFee,
      voucherMint: voucherMint,
      marketVoucher: marketTokens[0],
      marketSol: marketTokens[1],
      userVoucher: userTokenVoucher,
      creator: exhibitInfo.creator,
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
  vouchers: number,
  signTransaction: any,
  connection: Connection
) {
  console.log("in instruction dpeo");
  let { Bazaar } = await getBazaarProgramAndProvider(wallet);

  let [
    voucherMint,
    marketAuth,
    authBump,
    marketTokens,
    userTokenVoucher,
    liqMint,
  ] = await getSwapAccounts(exhibit, publicKey);

  let tokenMints = new Array(1);
  let temp;
  [tokenMints[0], temp] = await PublicKey.findProgramAddress(
    [Buffer.from("market_token_mint"), marketAuth.toBuffer()],
    BAZAAR_PROGRAM_ID
  );

  let userTokenLiq = await getAssociatedTokenAddress(tokenMints[0], publicKey);

  let transaction = new Transaction();

  if (!(await checkIfAccountExists(userTokenLiq, connection))) {
    let voucher_tx = createAssociatedTokenAccountInstruction(
      publicKey,
      userTokenLiq,
      publicKey,
      voucherMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    transaction = transaction.add(voucher_tx);
  } else {
    console.log("user voucher already created");
  }

  const deposit_liq_tx = await Bazaar.methods
    .depositLiquidity(new BN(vouchers), authBump)
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

export async function instructionWithdrawLiquidity(
  wallet: Wallet,
  publicKey: PublicKey,
  exhibit: PublicKey,
  liqTokens: number,
  vouchers: number,
  signTransaction: any,
  connection: Connection
) {
  console.log("in instruction dpeo");
  let { Bazaar } = await getBazaarProgramAndProvider(wallet);

  let [
    voucherMint,
    marketAuth,
    authBump,
    marketTokens,
    userTokenVoucher,
    liqMint,
  ] = await getSwapAccounts(exhibit, publicKey);

  let tokenMints = new Array(1);
  let temp;
  [tokenMints[0], temp] = await PublicKey.findProgramAddress(
    [Buffer.from("market_token_mint"), marketAuth.toBuffer()],
    BAZAAR_PROGRAM_ID
  );

  let userTokenLiq = await getAssociatedTokenAddress(tokenMints[0], publicKey);

  let transaction = new Transaction();

  if (!(await checkIfAccountExists(userTokenLiq, connection))) {
    let voucher_tx = createAssociatedTokenAccountInstruction(
      publicKey,
      userTokenLiq,
      publicKey,
      voucherMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    transaction = transaction.add(voucher_tx);
  } else {
    console.log("user voucher already created");
  }

  const withdraw_liq_tx = await Bazaar.methods
    .withdrawLiquidity(new BN(liqTokens), new BN(vouchers), authBump)
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
  transaction = transaction.add(withdraw_liq_tx);
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
