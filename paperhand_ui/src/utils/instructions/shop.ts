import {
  SHOP_PROGRAM_ID,
  EXHIBITION_PROGRAM_ID,
  getShopProgramAndProvider,
  getExhibitProgramAndProvider,
} from "@/utils/constants";
import { checkIfAccountExists } from "@/utils/retrieveData";

import {
  getNftDerivedAddresses,
  getShopAccounts,
  getCheckoutAccounts,
} from "@/utils/accountDerivation";

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
import { manualSendTransaction } from "./general";

export async function instructionInitSwap(
  wallet: Wallet,
  publicKey: PublicKey,
  exhibit: PublicKey,
  solIn: number,
  voucherIn: number,
  signTransaction: any,
  connection: Connection
) {
  console.log("in init instruction", solIn, voucherIn);
  let { Shop } = await getShopProgramAndProvider(wallet);

  // let [
  //   userTokenVoucher,
  // ] = await getSwapAccounts(exhibit, publicKey);

  let { voucherMint, marketAuth, shopAuthBump, marketTokens, liqMint } =
    await getShopAccounts(exhibit);

  let userTokenLiq = await getAssociatedTokenAddress(liqMint, publicKey);
  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

  let marketTokenFee = await getAssociatedTokenAddress(
    liqMint,
    marketAuth,
    true
  );

  let transaction = new Transaction();

  if (!(await checkIfAccountExists(userVoucherWallet, connection))) {
    let voucher_wallet_tx = createAssociatedTokenAccountInstruction(
      publicKey,
      userVoucherWallet,
      publicKey,
      voucherMint
    );
    transaction = transaction.add(voucher_wallet_tx);
  } else {
    console.log("user voucher already created");
  }

  const init_market_tx = await Shop.methods
    .initializeMarket(
      new BN(voucherIn),
      new BN(solIn * LAMPORTS_PER_SOL),
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
      user: publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  console.log("before add");
  transaction = transaction.add(init_market_tx);

  try {
    console.log("before manual send");

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
  let { Shop } = await getShopProgramAndProvider(wallet);

  let { Exhibition } = await getExhibitProgramAndProvider(wallet);

  let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
  console.log(exhibitInfo.creator.toString());

  let { voucherMint, marketAuth, shopAuthBump, marketTokens } =
    await getShopAccounts(exhibit);

  // let marketTokenFee = await getAssociatedTokenAddress(
  //   liqMint,
  //   marketAuth,
  //   true
  // );
  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

  let transaction = new Transaction();

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

  console.log("swap amounts", vouchers, buyVouchers);
  const swap_tx = await Shop.methods
    .swap(new BN(vouchers), buyVouchers, shopAuthBump)
    .accounts({
      exhibit: exhibit,
      marketAuth: marketAuth,
      // marketTokenFee: marketTokenFee,
      voucherMint: voucherMint,
      marketVoucher: marketTokens[0],
      marketSol: marketTokens[1],
      userVoucher: userVoucherWallet,
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
  let { Shop } = await getShopProgramAndProvider(wallet);

  let { voucherMint, marketAuth, shopAuthBump, marketTokens, liqMint } =
    await getShopAccounts(exhibit);

  let userTokenLiq = await getAssociatedTokenAddress(liqMint, publicKey);
  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

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

  const deposit_liq_tx = await Shop.methods
    .depositLiquidity(new BN(vouchers), shopAuthBump)
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
  let { Shop } = await getShopProgramAndProvider(wallet);

  let { voucherMint, marketAuth, shopAuthBump, marketTokens, liqMint } =
    await getShopAccounts(exhibit);

  let userTokenLiq = await getAssociatedTokenAddress(liqMint, publicKey);
  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

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

  const withdraw_liq_tx = await Shop.methods
    .withdrawLiquidity(new BN(liqTokens), new BN(vouchers), shopAuthBump)
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
