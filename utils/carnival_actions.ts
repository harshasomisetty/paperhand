import { Nft } from "@metaplex-foundation/js";
import { BN, Program } from "@project-serum/anchor";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  getCarnivalAccounts,
  getNftDerivedAddresses,
} from "./accountDerivation";
import { checkIfAccountExists, getProvider } from "./actions";
import { CARNIVAL_PROGRAM_ID, EXHIBITION_PROGRAM_ID } from "./constants";
import { IDL as CARNIVAL_IDL, Carnival } from "../target/types/carnival";
import { Exhibition, IDL as EXHIBITION_IDL } from "../target/types/exhibition";
import { otherCreators, creator, users } from "../utils/constants";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getOpenBoothId } from "./carnival_data";

export async function carnivalDepositNft(
  connection: Connection,
  nft: Nft,
  publicKey: PublicKey,
  boothId: number
): Promise<Transaction> {
  let provider = await getProvider("http://localhost:8899", creator);
  let Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);
  let Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);

  let transaction = new Transaction();

  let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(nft);

  let { carnival, carnivalAuth, carnivalAuthBump } = await getCarnivalAccounts(
    exhibit
  );

  let nftUserTokenAddress = await getAssociatedTokenAddress(
    nft.mint,
    publicKey
  );

  let [booth, boothBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("booth"),
      carnival.toBuffer(),
      new BN(boothId).toArrayLike(Buffer, "le", 8),
    ],
    CARNIVAL_PROGRAM_ID
  );

  // if (!(await checkIfAccountExists(nftUserTokenAddress, connection))) {
  //   let voucher_tx = createAssociatedTokenAccountInstruction(
  //     publicKey,
  //     nftUserTokenAddress,
  //     publicKey,
  //     nft.mint
  //   );
  // transaction = transaction.add(voucher_tx);
  // }

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

  if (!(await checkIfAccountExists(userVoucherWallet, connection))) {
    let userVoucherTx = createAssociatedTokenAccountInstruction(
      publicKey,
      userVoucherWallet,
      publicKey,
      voucherMint
    );
    transaction = transaction.add(userVoucherTx);
  }

  let depositNftTx = await Carnival.methods
    .depositNft(new BN(boothId), carnivalAuthBump, boothBump)
    .accounts({
      exhibit: exhibit,
      carnival: carnival,
      carnivalAuth: carnivalAuth,
      booth: booth,
      voucherMint: voucherMint,
      userVoucherWallet: userVoucherWallet,
      nftMint: nft.mint,
      nftMetadata: nft.metadataAccount.publicKey,
      nftUserToken: nftUserTokenAddress,
      nftArtifact: nftArtifact,
      signer: publicKey,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      exhibitionProgram: EXHIBITION_PROGRAM_ID,
    })
    .transaction();

  return transaction.add(depositNftTx);
}

export async function carnivalWithdrawNft(
  connection: Connection,
  nft: Nft,
  publicKey: PublicKey,
  boothId: number
): Promise<Transaction> {
  let provider = await getProvider("http://localhost:8899", creator);
  let Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);
  let Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);

  let transaction = new Transaction();

  let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(nft);

  let { carnival, carnivalAuth, carnivalAuthBump } = await getCarnivalAccounts(
    exhibit
  );

  let nftUserTokenAddress = await getAssociatedTokenAddress(
    nft.mint,
    publicKey
  );

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

  let [booth, boothBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("booth"),
      carnival.toBuffer(),
      new BN(boothId).toArrayLike(Buffer, "le", 8),
    ],
    CARNIVAL_PROGRAM_ID
  );

  let withdrawNftTx = await Carnival.methods
    .withdrawNft(new BN(boothId), carnivalAuthBump, boothBump)
    .accounts({
      exhibit: exhibit,
      carnival: carnival,
      carnivalAuth: carnivalAuth,
      booth: booth,
      voucherMint: voucherMint,
      userVoucherWallet: userVoucherWallet,
      nftMint: nft.mint,
      nftMetadata: nft.metadataAccount.publicKey,
      nftUserToken: nftUserTokenAddress,
      nftArtifact: nftArtifact,
      signer: publicKey,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      exhibitionProgram: Exhibition.programId,
    })
    .transaction();

  return transaction.add(withdrawNftTx);
}

export async function createCarnivalBooth(
  connection: Connection,
  publicKey: PublicKey,
  nfts: Nft[],
  solAmt: number
): Promise<Transaction> {
  console.log("In Create Carnival Booth function");
  let provider = await getProvider("http://localhost:8899", creator);
  let Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);
  let Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);

  let transaction = new Transaction();

  let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
    nfts[0]
  );

  let { carnival, carnivalAuth, carnivalAuthBump, escrowSol, escrowSolBump } =
    await getCarnivalAccounts(exhibit);

  let boothId = await getOpenBoothId(carnival);
  console.log("Booth ID", boothId);
  // make booth

  let [booth, boothBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("booth"),
      carnival.toBuffer(),
      new BN(boothId).toArrayLike(Buffer, "le", 8),
    ],
    CARNIVAL_PROGRAM_ID
  );

  console.log("function booth", booth.toString());

  if (!(await checkIfAccountExists(booth, connection))) {
    console.log("booth no exist");
    let initBoothTx = await Carnival.methods
      .createBooth(users[0].publicKey, new BN(boothId), 0, 1, 1)
      .accounts({
        exhibit: exhibit,
        carnival: carnival,
        carnivalAuth: carnivalAuth,
        booth: booth,
        signer: users[0].publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction = transaction.add(initBoothTx);

    console.log("added tx");
  } else {
    console.log("booth exists");
  }

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
        signer: users[0].publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction = transaction.add(depoSolTx);
    console.log("added depo tx");
  }

  // let nft = nfts[0];

  // for (let nft of nfts) {
  //   let depositNftTx = await carnivalDepositNft(
  //     connection,
  //     nft,
  //     publicKey,
  //     boothId
  //   );
  //   transaction = transaction.add(depositNftTx);
  // }

  // console.log("added full depo nft tx");

  return transaction;
}

export async function closeCarnivalBooth(
  connection: Connection,
  publicKey: PublicKey,
  exhibit: PublicKey,
  nfts: Nft[],
  solAmt: number,
  boothId: number
): Promise<Transaction> {
  let provider = await getProvider("http://localhost:8899", creator);
  let Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);

  let transaction = new Transaction();

  let { carnival, carnivalAuth, carnivalAuthBump, escrowSol, escrowSolBump } =
    await getCarnivalAccounts(exhibit);

  // make booth

  let [booth, boothBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("booth"),
      carnival.toBuffer(),
      new BN(boothId).toArrayLike(Buffer, "le", 8),
    ],
    CARNIVAL_PROGRAM_ID
  );

  // withdraw sol
  console.log("in withdraw sol section");
  let withdrawSolTx = await Carnival.methods
    .withdrawSol(
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
      signer: users[0].publicKey,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  transaction = transaction.add(withdrawSolTx);
  console.log("added withdraw sol tx");

  // withdraw NFTs
  // for (let nft of nfts) {
  let nft = nfts[0];

  let withdrawNftTx = await carnivalWithdrawNft(
    connection,
    nft,
    publicKey,
    boothId
  );

  transaction = transaction.add(withdrawNftTx);

  console.log("added withdraw nft tx");

  // let closeBoothTx = await Carnival.methods
  //   .closeBooth(users[0].publicKey, new BN(boothId), 0, 1, 1)
  //   .accounts({
  //     exhibit: exhibit,
  //     carnival: carnival,
  //     carnivalAuth: carnivalAuth,
  //     booth: booth,
  //     signer: users[0].publicKey,
  //     systemProgram: SystemProgram.programId,
  //   })
  //   .transaction();

  // transaction = transaction.add(closeBoothTx);

  return transaction;
}
