import {
  SHOP_PROGRAM_ID,
  EXHIBITION_PROGRAM_ID,
  getShopProgramAndProvider,
  getExhibitProgramAndProvider,
  getCheckoutProgramAndProvider,
} from "@/utils/constants";
import {
  checkIfAccountExists,
  checkIfExhibitExists,
  getFilledOrdersList,
  getMatchedOrdersAccountData,
} from "@/utils/retrieveData";

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
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Nft } from "@metaplex-foundation/js";

async function manualSendTransaction(
  transaction: Transaction,
  publicKey: PublicKey,
  connection: Connection,
  signTransaction: any
) {
  console.log("in man send tx");
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

export async function instructionPlaceBid(
  wallet: Wallet,
  publicKey: PublicKey,
  exhibit: PublicKey,
  bidSize: number,
  signTransaction: any,
  connection: Connection
) {
  console.log("in make mids");

  let { Checkout } = await getCheckoutProgramAndProvider(wallet);

  let {
    matchedStorage,
    bidOrders,
    checkoutAuth,
    checkoutAuthBump,
    escrowSol,
    escrowVoucher,
  } = await getCheckoutAccounts(exhibit);

  let place_bid_tx = await Checkout.methods
    .makeBid(new BN(bidSize))
    .accounts({
      exhibit: exhibit,
      bidOrders: bidOrders,
      escrowSol: escrowSol,
      bidder: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  let transaction = new Transaction().add(place_bid_tx);

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

export async function instructionBidFloor(
  wallet: Wallet,
  publicKey: PublicKey,
  exhibit: PublicKey,
  bidCount: number,
  signTransaction: any,
  connection: Connection,
  nft?: Nft
) {
  console.log("in bid floor");

  let { Checkout } = await getCheckoutProgramAndProvider(wallet);
  let { Exhibition } = await getExhibitProgramAndProvider(wallet);

  let {
    voucherMint,
    matchedStorage,
    bidOrders,
    checkoutAuth,
    checkoutAuthBump,
    escrowSol,
    escrowVoucher,
  } = await getCheckoutAccounts(exhibit);

  let matchedOrdersInfo = await getMatchedOrdersAccountData(
    matchedStorage,
    wallet
  );
  let matchedOrders = matchedOrdersInfo.matchedOrders;

  let transaction = new Transaction();

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

  if (!(await checkIfAccountExists(userVoucherWallet, connection))) {
    console.log("creating user voucher");
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

  if (nft) {
    console.log("in nft adding");
    let [nftArtifact] = await PublicKey.findProgramAddress(
      [Buffer.from("nft_artifact"), exhibit!.toBuffer(), nft.mint.toBuffer()],
      EXHIBITION_PROGRAM_ID
    );

    let nftUserTokenAccount = await getAssociatedTokenAddress(
      nft.mint,
      publicKey
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
        user: publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    transaction = transaction.add(insert_nft_tx);
  }

  let bid_floor_tx = await Checkout.methods
    .bidFloor()
    .accounts({
      exhibit: exhibit,
      matchedOrders: matchedOrders,
      matchedStorage: matchedStorage,
      bidOrders: bidOrders,
      checkoutAuth: checkoutAuth,
      voucherMint: voucherMint,
      escrowVoucher: escrowVoucher,
      escrowSol: escrowSol,
      userVoucher: userVoucherWallet,
      user: publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  transaction = transaction.add(bid_floor_tx);

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

export async function instructionAcquireNft(
  wallet: Wallet,
  publicKey: PublicKey,
  exhibit: PublicKey,
  signTransaction: any,
  connection: Connection,
  nft: Nft
) {
  console.log("in bid floor");

  let { Checkout } = await getCheckoutProgramAndProvider(wallet);
  let { Exhibition } = await getExhibitProgramAndProvider(wallet);

  let {
    voucherMint,
    matchedStorage,
    checkoutAuth,
    checkoutAuthBump,
    escrowVoucher,
  } = await getCheckoutAccounts(exhibit);

  let { nftArtifact } = await getNftDerivedAddresses(nft);

  let transaction = new Transaction();

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

  let nftUserTokenAccount = await getAssociatedTokenAddress(
    nft.mint,
    publicKey
  );

  let totalVouchers = 0;
  let currentVouchers = 0;
  if (await checkIfAccountExists(userVoucherWallet, connection)) {
    currentVouchers = Number(
      (await getAccount(connection, userVoucherWallet)).amount
    );
  }
  let orderFilled = await getFilledOrdersList(matchedStorage, wallet);

  totalVouchers = currentVouchers + orderFilled[publicKey];

  if (totalVouchers == 0) {
    console.log("not enough vouchers");
    return;
  }

  if (currentVouchers == 0) {
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

    let matchedOrdersInfo = await Checkout.account.matchedStorage.fetch(
      matchedStorage
    );
    let matchedOrders = matchedOrdersInfo.matchedOrders;

    const fulfill_tx = await Checkout.methods
      .fulfillOrder(publicKey, checkoutAuthBump)
      .accounts({
        exhibit: exhibit,
        matchedOrders: matchedOrders,
        matchedStorage: matchedStorage,
        checkoutAuth: checkoutAuth,
        voucherMint: voucherMint,
        escrowVoucher: escrowVoucher,
        orderVoucher: userVoucherWallet,
        orderUser: publicKey,
        user: publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();
    transaction = transaction.add(fulfill_tx);
  }

  if (!(await checkIfAccountExists(nftUserTokenAccount, connection))) {
    let nft_token_account_tx = createAssociatedTokenAccountInstruction(
      publicKey,
      nftUserTokenAccount,
      publicKey,
      nft.mint
    );
    transaction = transaction.add(nft_token_account_tx);
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
  console.log("Acquired nft!");
}
