import { BN, Wallet } from "@project-serum/anchor";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Keypair,
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
import { Nft, Signer } from "@metaplex-foundation/js";

import {
  EXHIBITION_PROGRAM_ID,
  getExhibitProgramAndProvider,
  getCheckoutProgramAndProvider,
} from "@/utils/constants";
import {
  checkIfAccountExists,
  getFilledOrdersList,
  getMatchedOrdersAccountData,
} from "@/utils/retrieveData";
import {
  getNftDerivedAddresses,
  getCheckoutAccounts,
} from "@/utils/accountDerivation";

async function manualSendTransaction(
  transaction: Transaction,
  publicKey: PublicKey,
  connection: Connection,
  signTransaction: any,
  otherSigner?: Keypair
) {
  console.log("in man send tx");
  transaction.feePayer = publicKey;
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash("finalized")
  ).blockhash;

  if (otherSigner) {
    transaction.sign(otherSigner);
  }

  transaction = await signTransaction(transaction);
  const rawTransaction = transaction.serialize();

  let signature = await connection.sendRawTransaction(rawTransaction);
  console.log("sent raw, waiting");
  await connection.confirmTransaction(signature, "confirmed");
  console.log("sent tx!!!");
}

export async function instructionInitCheckoutExhibit(
  wallet: Wallet,
  publicKey: PublicKey,
  signTransaction: any,
  connection: Connection,
  nft: Nft
) {
  console.log("in make init checkout");

  let { Exhibition } = await getExhibitProgramAndProvider(wallet);
  let { Checkout } = await getCheckoutProgramAndProvider(wallet);

  await nft.metadataTask.run();
  let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(nft);

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint!,
    publicKey
  );

  let transaction = new Transaction();

  if (!(await checkIfAccountExists(exhibit, connection))) {
    const init_tx = await Exhibition.methods
      .initializeExhibit()
      .accounts({
        exhibit: exhibit,
        voucherMint: voucherMint,
        nftMetadata: nft.metadataAccount.publicKey,
        signer: publicKey,
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

  let { matchedStorage, bidOrders, checkoutAuth, escrowSol, escrowVoucher } =
    await getCheckoutAccounts(exhibit);

  let matchedOrdersPair: Keypair = Keypair.generate();
  let matchedOrders = matchedOrdersPair.publicKey;

  const init_create_tx = await SystemProgram.createAccount({
    fromPubkey: publicKey,
    newAccountPubkey: matchedOrders,
    space: 3610,
    lamports: await connection.getMinimumBalanceForRentExemption(3610),
    programId: Checkout.programId,
  });

  const init_checkout_tx = await Checkout.methods
    .initialize()
    .accounts({
      exhibit: exhibit,
      matchedStorage: matchedStorage,
      matchedOrders: matchedOrders,
      bidOrders: bidOrders,
      checkoutAuth: checkoutAuth,
      voucherMint: voucherMint,
      escrowVoucher: escrowVoucher,
      escrowSol: escrowSol,
      user: publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      exhibitionProgram: Exhibition.programId,
    })
    .transaction();

  transaction = transaction.add(init_create_tx);
  transaction = transaction.add(init_checkout_tx);

  await manualSendTransaction(
    transaction,
    publicKey,
    connection,
    signTransaction,
    matchedOrdersPair
  );
  console.log("Created Checkout!");
}

export async function instructionPlaceBid(
  wallet: Wallet,
  publicKey: PublicKey,
  exhibit: PublicKey,
  bidSize: number,
  signTransaction: any,
  connection: Connection
) {
  console.log("in make bids");

  let { Checkout } = await getCheckoutProgramAndProvider(wallet);

  let { bidOrders, escrowSol } = await getCheckoutAccounts(exhibit);

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

  console.log("final trans", transaction);
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
  signTransaction: any,
  connection: Connection,
  chosenNfts: Record<string, Nft>
) {
  console.log("in bid floor");

  console.log("pubkey? ", publicKey);

  let { Exhibition } = await getExhibitProgramAndProvider(wallet);
  let { Checkout } = await getCheckoutProgramAndProvider(wallet);

  console.log("chosen nfts", chosenNfts);
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

  console.log("Nfts", Object.values(chosenNfts));
  for (let nft of Object.values(chosenNfts)) {
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
        signer: publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    transaction = transaction.add(insert_nft_tx);

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
  }

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
  chosenNfts: Record<string, Nft>
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

  let transaction = new Transaction();

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

  let matchedOrdersInfo = await Checkout.account.matchedStorage.fetch(
    matchedStorage
  );
  let matchedOrders = matchedOrdersInfo.matchedOrders;

  for (let nft of Object.values(chosenNfts)) {
    let { nftArtifact } = await getNftDerivedAddresses(nft);

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
        signer: publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    transaction = transaction.add(withdraw_tx);
  }

  await manualSendTransaction(
    transaction,
    publicKey,
    connection,
    signTransaction
  );
  console.log("Acquired nft!");
}

export async function instructionCancelBid(
  wallet: Wallet,
  publicKey: PublicKey,
  exhibit: PublicKey,
  signTransaction: any,
  connection: Connection
) {
  console.log("in bid floor");

  let { Checkout } = await getCheckoutProgramAndProvider(wallet);

  let { bidOrders, escrowSol } = await getCheckoutAccounts(exhibit);

  let transaction = new Transaction();

  const cancel_tx = await Checkout.methods
    .cancelBid()
    .accounts({
      exhibit: exhibit,
      bidOrders: bidOrders,
      escrowSol: escrowSol,
      bidder: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  transaction = transaction.add(cancel_tx);

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
