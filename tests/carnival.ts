import { keypairIdentity, Metaplex, Nft } from "@metaplex-foundation/js";
import * as anchor from "@project-serum/anchor";
import { BN, Program } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
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

  before("Init create and mint exhibits and Metadata", async () => {
    let airdropees = [creator, ...otherCreators, ...users];

    await airdropAll(airdropees, airdropVal, connection);

    nftList.push(
      await mintNFTs(metaplex, connection, APE_URIS, otherCreators[0], [
        users[0].publicKey,
        users[1].publicKey,
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
    // console.log("nft list", nftList);

    let solAmts = [2 * LAMPORTS_PER_SOL, 4 * LAMPORTS_PER_SOL];

    let numBooths = 2;
    for (let i = 0; i < numBooths; i++) {
      console.log("Creating booth ", i);
      let nfts = [nftList[0][i * 4], nftList[0][i * 4 + 2]];

      let { exhibit, nftArtifact } = await getNftDerivedAddresses(nfts[0]);
      let { carnival, escrowSol } = await getCarnivalAccounts(exhibit);
      let transaction = await createCarnivalBooth(
        connection,
        users[0].publicKey,
        nfts,
        solAmts[i]
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

      printAndTest(boothNfts.length, 2);
      console.log("booth nfts", boothNfts[0].name, boothNfts[1].name);
    }

    // check data of how much nfts each pool contains

    console.log("Finsihed Initing all booths");
  });

  it.skip("Tried inserting SOL and nft to a booth user doens't own", async () => {
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
  // it("Buy Specific NFTs", async () => {});

  // it("Buy any NFTs", async () => {});

  // it("Sell some NFTs", async () => {});

  it.skip("Withdraw Funds (close booth)", async () => {
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
