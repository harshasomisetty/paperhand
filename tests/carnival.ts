import { keypairIdentity, Metaplex, Nft } from "@metaplex-foundation/js";
import * as anchor from "@project-serum/anchor";
import { BN, Program } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { getBoothInfo } from "../paperhand_ui/src/utils/carnival_data";
import { Carnival } from "../target/types/carnival";
import { Exhibition } from "../target/types/exhibition";
import {
  getCarnivalAccounts,
  getNftDerivedAddresses,
} from "../utils/accountDerivation";
// import { getCheckoutAccounts } from "../utils/accountDerivation";
import { checkIfAccountExists } from "../utils/actions";
import {
  carnivalDepositNft,
  closeCarnivalBooth,
  createCarnivalBooth,
} from "../utils/carnival_actions";
import { getAllBooths, getBoothNfts } from "../utils/carnival_data";
import {
  otherCreators,
  creator,
  users,
  CARNIVAL_PROGRAM_ID,
  APE_URIS,
  EXHIBITION_PROGRAM_ID,
} from "../utils/constants";
import { mintNFTs } from "../utils/createNFTs";
import {
  airdropAll,
  printAndTest,
  regSol,
  tryCatchWrap,
} from "../utils/helpfulFunctions";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const Carnival = anchor.workspace.Carnival as Program<Carnival>;
const Exhibition = anchor.workspace.Exhibition as Program<Exhibition>;

const metaplex = Metaplex.make(connection).use(keypairIdentity(creator));

describe("carnival", () => {
  let airdropVal = 60 * LAMPORTS_PER_SOL;

  let nftList: Nft[][] = [];
  let solAmts = [4 * LAMPORTS_PER_SOL, 5 * LAMPORTS_PER_SOL];

  before("Init create and mint exhibits and Metadata", async () => {
    let airdropees = [creator, ...otherCreators, ...users];

    await airdropAll(airdropees, airdropVal, connection);

    nftList.push(
      await mintNFTs(metaplex, connection, APE_URIS, otherCreators[0], [
        users[0].publicKey,
      ])
    );

    await new Promise((r) => setTimeout(r, 2000));
  });

  it("Initialized Carnival", async () => {
    let nft = nftList[0][0];

    let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);
    let { carnival, carnivalAuth, carnivalAuthBump, escrowSol } =
      await getCarnivalAccounts(exhibit);

    let transaction = new Transaction();

    // TODO TRY CREATE EXHIBITION

    if (!(await checkIfAccountExists(exhibit, connection))) {
      const init_tx = await Exhibition.methods
        .initializeExhibit()
        .accounts({
          exhibit: exhibit,
          voucherMint: voucherMint,
          nftMetadata: nft.metadataAccount.publicKey,
          signer: users[0].publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      transaction = transaction.add(init_tx);

      console.log("Added init exhibit instruction");
    }

    let initCarnTx = await Carnival.methods
      .initializeCarnival()
      .accounts({
        exhibit: exhibit,
        carnival: carnival,
        carnivalAuth: carnivalAuth,
        voucherMint: voucherMint,
        nftMetadata: nft.metadataAccount.publicKey,
        escrowSol: escrowSol,
        signer: users[0].publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction = transaction.add(initCarnTx);

    console.log("about to send create carnival tx");

    try {
      connection.confirmTransaction(
        await sendAndConfirmTransaction(connection, transaction, [users[0]]),
        "confirmed"
      );
    } catch (error) {
      console.log("", error);
    }

    printAndTest(
      await checkIfAccountExists(exhibit, connection),
      true,
      "booth created"
    );

    printAndTest(
      await checkIfAccountExists(carnival, connection),
      true,
      "check carnival exists"
    );

    console.log(
      "program accounts count",
      (await connection.getProgramAccounts(CARNIVAL_PROGRAM_ID)).length
    );
  });

  it("Made all booths", async () => {
    // start price

    let numBooths = 2;
    for (let i = 0; i < numBooths; i++) {
      console.log("Creating booth ", i);
      let nfts = nftList[0].slice(0 + i * 5, 5 + i * 5);

      let { exhibit, nftArtifact } = await getNftDerivedAddresses(nfts[0]);
      let { carnival, escrowSol } = await getCarnivalAccounts(exhibit);
      let transaction = await createCarnivalBooth(
        connection,
        users[0].publicKey,
        nfts,
        solAmts[i],
        0,
        2,
        0.1 * LAMPORTS_PER_SOL,
        1
      );
      console.log("outside of create carnival booth");

      try {
        connection.confirmTransaction(
          await sendAndConfirmTransaction(connection, transaction, [users[0]]),
          "confirmed"
        );
      } catch (error) {
        console.log("trying to create booth", error);
      }

      let carnivalInfo = await Carnival.account.carnivalAccount.fetch(carnival);
      console.log("carni info", carnivalInfo.boothIdCount);
      for (let nft of nfts) {
        let transaction = await carnivalDepositNft(
          connection,
          nft,
          users[0].publicKey,
          i
        );
        try {
          connection.confirmTransaction(
            await sendAndConfirmTransaction(connection, transaction, [
              users[0],
            ]),
            "confirmed"
          );
        } catch (error) {
          console.log("trying to create booth", error);
        }
      }
    }

    let { exhibit, nftArtifact } = await getNftDerivedAddresses(nftList[0][0]);
    let { carnival, escrowSol } = await getCarnivalAccounts(exhibit);

    printAndTest(
      regSol(await connection.getBalance(escrowSol)),
      regSol(solAmts.reduce((partialSum, a) => partialSum + a, 0))
    );

    let boothInfos = await getAllBooths(connection, exhibit, numBooths);

    printAndTest(
      Object.keys(boothInfos).length,
      numBooths,
      "right number of booths were made"
    );

    for (let index of Object.keys(boothInfos)) {
      let booth = boothInfos[index].publicKey;

      printAndTest(await checkIfAccountExists(booth, connection), true);

      let boothNfts = await getBoothNfts(connection, exhibit, booth);

      printAndTest(boothNfts.length, 5);
      console.log("booth nfts", boothNfts[0].name, boothNfts[1].name);
    }

    // check data of how much nfts each pool contains

    console.log("Finsihed Initing all booths");
  });

  it("Tried inserting SOL and nft to a booth user doens't own", async () => {
    let transaction = new Transaction();

    let boothId = 0;
    let solAmt = 1 * LAMPORTS_PER_SOL;

    let nfts = [nftList[0][0], nftList[0][3], nftList[0][5]];

    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nfts[0]
    );

    console.log("actions", nftArtifact.toString());
    console.log("exhibit", exhibit.toString());

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

    let preEscrowBal = await connection.getBalance(escrowSol);

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
        signer: users[1].publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction = transaction.add(depoSolTx);

    try {
      connection.confirmTransaction(
        await sendAndConfirmTransaction(connection, transaction, [users[1]]),
        "confirmed"
      );
    } catch (error) {
      console.log("NOT ALLOWED TO DEPOSIT SOL");
    }

    // printAndTest(
    //   await checkIfAccountExists(nftArtifact, connection),
    //   false,
    //   "nft withdrew"
    // );

    let postEscrowBal = await connection.getBalance(escrowSol);

    printAndTest(
      Number(preEscrowBal),
      Number(postEscrowBal),
      "Escrow Bal didn't change, since deposit not allowed"
    );
  });

  it("Buy Specific NFTs", async () => {
    // Try to buy a nft (and deposit sol)

    let nft = nftList[0][0];
    let transaction = new Transaction();

    // TODO find booth id from nft
    // let boothId = await getBoothInfo(connection, exhibit);

    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nft
    );

    let parsedArtifact = await getAccount(connection, nftArtifact);
    // console.log("parsed arti", parsedArtifact.delegate.toString());

    let boothId = 0;
    let publicKey = users[1].publicKey;

    let { carnival, carnivalAuth, carnivalAuthBump, escrowSol, escrowSolBump } =
      await getCarnivalAccounts(exhibit);

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

    let userVoucherWallet = await getAssociatedTokenAddress(
      voucherMint,
      publicKey
    );

    if (!(await checkIfAccountExists(userVoucherWallet, connection))) {
      console.log("voucher_wallet_ttx");
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

    if (!(await checkIfAccountExists(nftUserTokenAddress, connection))) {
      console.log("user nft_wallet_ttx");
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

    let preEscrowBal = await connection.getBalance(escrowSol);
    let preFetchedBoothInfo = await Carnival.account.booth.fetch(booth);

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

    try {
      connection.confirmTransaction(
        await sendAndConfirmTransaction(connection, transaction, [users[1]]),
        "confirmed"
      );
    } catch (error) {
      console.log("sol to nft carnival", error);
    }

    let postEscrowBal = await connection.getBalance(escrowSol);

    // TODO get right sol change

    printAndTest(
      Number(preEscrowBal) + solAmts[0],
      Number(postEscrowBal),
      "Gained more sol"
    );

    let postFetchedBoothInfo = await Carnival.account.booth.fetch(booth);

    printAndTest(
      Number(preFetchedBoothInfo.nfts) - 1,
      Number(postFetchedBoothInfo.nfts),
      "nft transferred back"
    );
  });

  it("Sell specific NFTs", async () => {
    let nft = nftList[0][0];
    let transaction = new Transaction();

    console.log("starting sell secific");
    // TODO find booth id from nft
    // let boothId = await getBoothInfo(connection, exhibit);

    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nft
    );

    let boothId = 0;
    let publicKey = users[1].publicKey;

    let { carnival, carnivalAuth, carnivalAuthBump, escrowSol, escrowSolBump } =
      await getCarnivalAccounts(exhibit);

    let nftUserTokenAddress = await getAssociatedTokenAddress(
      nft.mint,
      publicKey
    );
    console.log(
      "past nftUserTokenAdd?",
      await checkIfAccountExists(nftUserTokenAddress, connection)
    );

    // let nftUser?

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

    let preEscrowBal = await connection.getBalance(escrowSol);

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

    let preFetchedBoothInfo = await Carnival.account.booth.fetch(booth);

    try {
      let nftToSolTx = await Carnival.methods
        .tradeNftForSol(
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
          rent: SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          exhibitionProgram: EXHIBITION_PROGRAM_ID,
        })
        .transaction();

      transaction = transaction.add(nftToSolTx);

      connection.confirmTransaction(
        await sendAndConfirmTransaction(connection, transaction, [users[1]]),
        "confirmed"
      );
    } catch (error) {
      console.log("nft to sol carnival", error);
    }

    let postEscrowBal = await connection.getBalance(escrowSol);

    // TODO get right sol change

    let postFetchedBoothInfo = await Carnival.account.booth.fetch(booth);

    printAndTest(
      regSol(Number(preEscrowBal) - Number(postFetchedBoothInfo.spotPrice)),
      regSol(Number(postEscrowBal)),
      "Lost sol"
    );

    printAndTest(
      Number(preFetchedBoothInfo.nfts) + 1,
      Number(postFetchedBoothInfo.nfts),
      "nft transferred back"
    );
  });

  it("Withdraw Funds (close booth)", async () => {
    let solAmt = 1.5 * LAMPORTS_PER_SOL;

    let nfts = [nftList[0][0], nftList[0][1], nftList[0][2]];
    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nfts[0]
    );

    let boothId = 0;
    let { carnival, escrowSol } = await getCarnivalAccounts(exhibit);

    let preEscrowBal = await connection.getBalance(escrowSol);
    let transaction = await closeCarnivalBooth(
      connection,
      users[0].publicKey,
      exhibit,
      [nfts[0]],
      solAmt,
      boothId
    );

    try {
      connection.confirmTransaction(
        await sendAndConfirmTransaction(connection, transaction, [users[0]]),
        "confirmed"
      );
    } catch (error) {
      console.log("closing carnival", error);
    }

    printAndTest(
      await checkIfAccountExists(nftArtifact, connection),
      false,
      "nft withdrew"
    );

    let postEscrowBal = await connection.getBalance(escrowSol);

    printAndTest(
      Number(preEscrowBal),
      Number(postEscrowBal) + solAmt,
      "Escrow Bal"
    );
  });

  Carnival.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
