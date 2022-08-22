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

const metaplex = Metaplex.make(provider.connection).use(
  keypairIdentity(creator)
);

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
    let { carnival } = await getCarnivalAccounts(exhibit);

    let transaction = await createCarnival(connection, nft, users[0].publicKey);

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
    let solAmt = 2 * LAMPORTS_PER_SOL;

    let nftTransferList = [nftList[0][0], nftList[0][2], nftList[0][4]];
    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nftTransferList[0]
    );

    let marketId = 0;
    let { carnival, escrowSol } = await getCarnivalAccounts(exhibit);

    let [market] = await PublicKey.findProgramAddress(
      [
        Buffer.from("market"),
        carnival.toBuffer(),
        new BN(marketId).toArrayLike(Buffer, "le", 8),
      ],
      CARNIVAL_PROGRAM_ID
    );

    let transaction = await createCarnivalMarket(
      connection,
      users[0].publicKey,
      nftTransferList,
      solAmt,
      marketId
    );

    connection.confirmTransaction(
      await sendAndConfirmTransaction(connection, transaction, [users[0]]),
      "confirmed"
    );

    printAndTest(
      await checkIfAccountExists(market, connection),
      true,
      "market created"
    );

    printAndTest(
      regSol(await connection.getBalance(escrowSol)),
      regSol(solAmt),
      "Escrow Bal"
    );

    printAndTest(
      Number((await getAccount(provider.connection, nftArtifact)).amount),
      1,
      "nft transferred"
    );

    let marketDelegates = await getMarketNfts(connection, exhibit, market);

    printAndTest(
      market.toString(),
      marketDelegates[0].toString(),
      "delegate is market"
    );
  });

  // it("Buy Specific NFTs", async () => {});

  // it("Buy any NFTs", async () => {});

  // it("Sell some NFTs", async () => {});

  it("Withdraw Funds (close market)", async () => {
    let solAmt = 1.5 * LAMPORTS_PER_SOL;

    let nftTransferList = [nftList[0][0], nftList[0][1], nftList[0][2]];
    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nftTransferList[0]
    );

    let marketId = 0;
    let { carnival, escrowSol } = await getCarnivalAccounts(exhibit);

    let transaction = await closeCarnivalMarket(
      connection,
      users[0].publicKey,
      exhibit,
      nftTransferList,
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

    let escrowBal = await connection.getBalance(escrowSol);

    printAndTest(escrowBal, 0.5 * LAMPORTS_PER_SOL, "Escrow Bal");
  });

  Carnival.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
