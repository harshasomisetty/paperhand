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
  closeCarnivalMarket,
  createCarnivalMarket,
} from "../utils/carnival_actions";
import { getAllMarkets, getMarketNfts } from "../utils/carnival_data";
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

// TODO RENAME carnival markets to booths
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

    console.log("about to send create carnival tx", transaction);

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
      "market created"
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

  it("Made all markets", async () => {
    // console.log("nft list", nftList);

    let nfts = [nftList[0][0], nftList[0][2], nftList[0][4]];
    let solAmts = [
      2 * LAMPORTS_PER_SOL,
      4 * LAMPORTS_PER_SOL,
      6 * LAMPORTS_PER_SOL,
    ];

    let { exhibit, nftArtifact } = await getNftDerivedAddresses(nfts[0]);

    let numMarkets = 3;
    for (let marketId = 0; marketId < numMarkets; marketId++) {
      console.log("Creating market ", marketId);
      let nftList = [nfts[marketId]];

      let transaction = await createCarnivalMarket(
        connection,
        users[0].publicKey,
        nftList,
        solAmts[marketId]
      );

      connection.confirmTransaction(
        await sendAndConfirmTransaction(connection, transaction, [users[0]]),
        "confirmed"
      );

      printAndTest(
        Number((await getAccount(connection, nftArtifact)).amount),
        1
      );
      await new Promise((r) => setTimeout(r, 1000));
    }

    let { escrowSol } = await getCarnivalAccounts(exhibit);
    printAndTest(
      regSol(await connection.getBalance(escrowSol)),
      regSol(solAmts.reduce((partialSum, a) => partialSum + a, 0))
    );

    let marketInfos = await getAllMarkets(connection, exhibit, numMarkets);

    console.log("markts and infos", marketInfos);

    printAndTest(
      Object.keys(marketInfos).length,
      numMarkets,
      "right number of markets were made"
    );

    for (let index of Object.keys(marketInfos)) {
      let market = marketInfos[index].publicKey;

      printAndTest(await checkIfAccountExists(market, connection), true);

      let marketNfts = await getMarketNfts(connection, exhibit, market);

      let marketDelegate =
        marketNfts[0].account.data.parsed.info.delegate.toString();

      printAndTest(
        market.toString(),
        marketDelegate,
        "market delegates between market and nfts accurate"
      );

      printAndTest(marketNfts.length, 1);
    }

    // check data of how much nfts each pool contains

    console.log("Finsihed Initing all markets");
  });
  // TODO MAke test that people can't insert or take out from markets that aren't theirs

  it("Tried inserting SOL and nft to a market user doens't own", async () => {
    let transaction = new Transaction();

    let marketId = 0;
    let solAmt = 1 * LAMPORTS_PER_SOL;

    let nfts = [nftList[0][0], nftList[0][3], nftList[0][5]];

    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nfts[0]
    );

    console.log("actions", nftArtifact.toString());
    console.log("exhibit", exhibit.toString());

    let { carnival, carnivalAuth, carnivalAuthBump, escrowSol, escrowSolBump } =
      await getCarnivalAccounts(exhibit);

    let [market, marketBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("market"),
        carnival.toBuffer(),
        new BN(marketId).toArrayLike(Buffer, "le", 8),
      ],
      CARNIVAL_PROGRAM_ID
    );

    let preEscrowBal = await connection.getBalance(escrowSol);

    let depoSolTx = await Carnival.methods
      .depositSol(
        new BN(marketId),
        new BN(solAmt),
        carnivalAuthBump,
        escrowSolBump
      )
      .accounts({
        exhibit: exhibit,
        carnival: carnival,
        carnivalAuth: carnivalAuth,
        market: market,
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

  it("Withdraw Funds (close market)", async () => {
    let solAmt = 1.5 * LAMPORTS_PER_SOL;

    let nfts = [nftList[0][0], nftList[0][1], nftList[0][2]];
    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nfts[0]
    );

    let marketId = 0;
    let { carnival, escrowSol } = await getCarnivalAccounts(exhibit);

    let preEscrowBal = await connection.getBalance(escrowSol);
    let transaction = await closeCarnivalMarket(
      connection,
      users[0].publicKey,
      exhibit,
      [nfts[0]],
      solAmt,
      marketId
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
