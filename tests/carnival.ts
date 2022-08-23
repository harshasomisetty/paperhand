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
  createCarnival,
  createCarnivalMarket,
} from "../utils/carnival_actions";
import { getMarketNfts } from "../utils/carnival_data";
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
        exhibitionProgram: Exhibition.programId,
      })
      .transaction();

    transaction = transaction.add(initCarnTx);

    console.log("about to send create carnival tx", transaction);

    connection.confirmTransaction(
      await sendAndConfirmTransaction(connection, transaction, [users[0]]),
      "confirmed"
    );

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
  });

  it("Made all markets", async () => {
    // console.log("nft list", nftList);

    let nfts = [nftList[0][0], nftList[0][2], nftList[0][4]];
    let solAmts = [
      2 * LAMPORTS_PER_SOL,
      4 * LAMPORTS_PER_SOL,
      6 * LAMPORTS_PER_SOL,
    ];

    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nfts[0]
    );

    let { carnival, escrowSol } = await getCarnivalAccounts(exhibit);

    for (let marketId = 0; marketId < 3; marketId++) {
      console.log("Starting creating", marketId);
      let nftList = [nfts[marketId]];

      let [market] = await PublicKey.findProgramAddress(
        [
          Buffer.from("market"),
          carnival.toBuffer(),
          new BN(marketId).toArrayLike(Buffer, "le", 8),
        ],
        CARNIVAL_PROGRAM_ID
      );

      console.log("for loop market", market.toString());
      let transaction = await createCarnivalMarket(
        connection,
        users[0].publicKey,
        nftList,
        solAmts[marketId],
        marketId
      );

      connection.confirmTransaction(
        await sendAndConfirmTransaction(connection, transaction, [users[0]]),
        "confirmed"
      );

      printAndTest(await checkIfAccountExists(market, connection), true);

      let marketNfts = await getMarketNfts(connection, exhibit, market);
      let marketDelegate =
        marketNfts[0].account.data.parsed.info.delegate.toString();

      printAndTest(market.toString(), marketDelegate, "market delegates");

      printAndTest(marketNfts.length, nftList.length);
      console.log("Created Market", marketId);
      printAndTest(
        Number((await getAccount(connection, nftArtifact)).amount),
        1
      );
    }

    printAndTest(
      regSol(await connection.getBalance(escrowSol)),
      regSol(solAmts.reduce((partialSum, a) => partialSum + a, 0))
    );

    // TODO CHECK LIST OF POOLS HERE AND DATA

    console.log("Finsihed Initing all markets");
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
