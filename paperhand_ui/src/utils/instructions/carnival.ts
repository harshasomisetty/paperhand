import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  Nft,
} from "@metaplex-foundation/js";
import { BN, Program, Wallet } from "@project-serum/anchor";
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
  getCarnivalAccounts,
  getNftDerivedAddresses,
} from "../accountDerivation";
import { carnivalDepositNft, createCarnivalBooth } from "../carnival_actions";
import { getBoothInfo, getOpenBoothId } from "../carnival_data";
import {
  CARNIVAL_PROGRAM_ID,
  EXHIBITION_PROGRAM_ID,
  getCarnivalProgramAndProvider,
} from "../constants";
import { checkIfAccountExists } from "../retrieveData";
import { manualSendTransaction } from "./general";

export async function instructionExecuteCreateBooth(
  wallet: Wallet,
  publicKey: PublicKey,
  nfts: Nft[],
  solAmt: number,
  curve: number,
  boothType: number,
  delta: number,
  fee: number,
  connection: Connection,
  signTransaction: any
) {
  let transaction = await createCarnivalBooth(
    connection,
    publicKey,
    nfts,
    solAmt,
    curve,
    boothType,
    delta,
    fee,
    wallet
  );

  try {
    await manualSendTransaction(
      transaction,
      publicKey,
      connection,
      signTransaction
    );
  } catch (error) {
    console.log("trying to create booth1", error);
  }

  await new Promise((r) => setTimeout(r, 500));

  let { exhibit } = await getNftDerivedAddresses(nfts[0]);

  let { carnival } = await getCarnivalAccounts(exhibit);

  let boothId = await getOpenBoothId(carnival, connection, wallet);

  for (let nft of nfts) {
    console.log("depoing nft", nft.name);
    let transaction2 = await carnivalDepositNft(
      connection,
      nft,
      publicKey,
      boothId - 1,
      wallet
    );
    try {
      await manualSendTransaction(
        transaction2,
        publicKey,
        connection,
        signTransaction
      );
    } catch (error) {
      console.log("trying to create booth loop", error);
    }
  }
}

export async function instructionCarnivalModifySol(
  wallet: Wallet,
  publicKey: PublicKey,
  solAmt: number,
  exhibit: PublicKey,
  booth: PublicKey,
  connection: Connection,
  signTransaction: any
) {
  let { Carnival } = await getCarnivalProgramAndProvider(wallet);

  let transaction = new Transaction();

  let { carnival, carnivalAuth, carnivalAuthBump, escrowSol, escrowSolBump } =
    await getCarnivalAccounts(exhibit);

  let fetchedBoothInfo = await Carnival.account.booth.fetch(booth);
  let boothId = fetchedBoothInfo.boothId;

  console.log("function booth", booth.toString());

  // deposit sol
  if (solAmt > 0) {
    console.log("in depo sol section");
    console.log("booth", booth.toString());
    let depoSolTx = await Carnival.methods
      .depositSol(
        new BN(boothId),
        new BN(solAmt),
        carnivalAuthBump,
        escrowSolBump
      )
      .accounts({
        exhibit: exhibit,
        carnival: carnival,
        carnivalAuth: carnivalAuth,
        booth: booth,
        escrowSol: escrowSol,
        signer: publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction = transaction.add(depoSolTx);
    console.log("added depo tx");
  } else {
    let withdrawSolTx = await Carnival.methods
      .withdrawSol(
        new BN(boothId),
        new BN(Math.abs(solAmt)),
        carnivalAuthBump,
        escrowSolBump
      )
      .accounts({
        exhibit: exhibit,
        carnival: carnival,
        carnivalAuth: carnivalAuth,
        booth: booth,
        escrowSol: escrowSol,
        signer: publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction = transaction.add(withdrawSolTx);
  }

  await manualSendTransaction(
    transaction,
    publicKey,
    connection,
    signTransaction
  );
}

export async function instructionSolToNft(
  wallet: Wallet,
  publicKey: PublicKey,
  nfts: Nft[],
  connection: Connection,
  signTransaction: any
) {
  let { Carnival } = await getCarnivalProgramAndProvider(wallet);

  let transaction = new Transaction();

  let { voucherMint } = await getNftDerivedAddresses(nfts[0]);

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

  console.log("user voucher wallet check");
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

  for (let nft of nfts) {
    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nft
    );

    let parsedArtifact = await getAccount(connection, nftArtifact);

    // let boothInfo = await getBoothInfo(exhibit, boothId, wallet);
    let fetchedBoothInfo = await Carnival.account.booth.fetch(
      parsedArtifact.delegate
    );

    let boothId = fetchedBoothInfo.boothId;
    let { carnival, carnivalAuth, carnivalAuthBump, escrowSol, escrowSolBump } =
      await getCarnivalAccounts(exhibit);

    let [booth, boothBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("booth"),
        carnival.toBuffer(),
        new BN(boothId).toArrayLike(Buffer, "le", 8),
      ],
      CARNIVAL_PROGRAM_ID
    );

    let userVoucherWallet = await getAssociatedTokenAddress(
      voucherMint,
      publicKey
    );

    let nftUserTokenAddress = await getAssociatedTokenAddress(
      nft.mint,
      publicKey
    );

    if (!(await checkIfAccountExists(nftUserTokenAddress, connection))) {
      let user_nft_tx = createAssociatedTokenAccountInstruction(
        publicKey,
        nftUserTokenAddress,
        publicKey,
        nft.mint
      );
      transaction = transaction.add(user_nft_tx);
    } else {
      console.log("user user wallet already created");
    }

    let solToNftTx = await Carnival.methods
      .tradeSolForNft(
        new BN(boothId),
        carnivalAuthBump,
        boothBump,
        escrowSolBump
      )
      .accounts({
        exhibit: exhibit,
        carnival: carnival,
        carnivalAuth: carnivalAuth,
        booth: booth,
        escrowSol: escrowSol,
        voucherMint: voucherMint,
        userVoucherWallet: userVoucherWallet,
        nftMint: nft.mint,
        nftMetadata: nft.metadataAccount.publicKey,
        nftUserToken: nftUserTokenAddress,
        nftArtifact: nftArtifact,
        signer: publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        exhibitionProgram: EXHIBITION_PROGRAM_ID,
      })
      .transaction();

    transaction = transaction.add(solToNftTx);
  }

  await manualSendTransaction(
    transaction,
    publicKey,
    connection,
    signTransaction
  );
}
