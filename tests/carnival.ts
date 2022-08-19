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
  createCarnival,
  createCarnivalMarket,
} from "../utils/carnival_actions";
import {
  otherCreators,
  creator,
  users,
  CARNIVAL_PROGRAM_ID,
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

  let mintCollectionCount = 1;
  let mintNftCount = 10;

  let nftList: Nft[][] = Array(mintNftCount);

  before("Init create and mint exhibits and Metadata", async () => {
    let airdropees = [creator, ...otherCreators, ...users];

    await airdropAll(airdropees, airdropVal, connection);

    nftList = await mintNFTs(
      mintNftCount,
      mintCollectionCount,
      metaplex,
      connection
    );
  });

  it("Initialized Carnival", async () => {
    let nft = nftList[0][0];

    let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);
    let { carnival } = await getCarnivalAccounts(exhibit);

    tryCatchWrap(await createCarnival(connection, exhibit, users[0].publicKey));

    let transaction = await createCarnival(
      connection,
      exhibit,
      users[0].publicKey
    );

    tryCatchWrap(
      connection.confirmTransaction(
        await sendAndConfirmTransaction(connection, transaction, [users[0]]),
        "confirmed"
      )
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

    let nftTransferList = [];
    // let nftTransferList = [nftList[0][0], nftList[0][2], nftList[0][4]];
    let { exhibit, voucherMint } = await getNftDerivedAddresses(nftList[0][0]);

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
      exhibit,
      nftTransferList,
      solAmt
    );

    console.log("got back transaction", transaction);

    try {
      connection.confirmTransaction(
        await sendAndConfirmTransaction(connection, transaction, [users[0]]),
        "confirmed"
      );
    } catch (error) {
      console.log("creating carnival", error);
    }

    printAndTest(
      await checkIfAccountExists(market, connection),
      true,
      "market created"
    );

    let escrowBal = await connection.getBalance(escrowSol);

    printAndTest(regSol(escrowBal), regSol(solAmt), "Escrow Bal");

    // let [nftArtifact] = await PublicKey.findProgramAddress(
    //   [
    //     Buffer.from("nft_artifact"),
    //     exhibit.toBuffer(),
    //     nftTransferList[0].mint.toBuffer(),
    //   ],
    //   Carnival.programId
    // );

    // let postNftArtifact = await getAccount(provider.connection, nftArtifact);
    // printAndTest(Number(postNftArtifact.amount), 1);
  });

  // it("Buy Specific NFTs", async () => {});

  // it("Buy any NFTs", async () => {});

  // it("Sell some NFTs", async () => {});

  // it("Withdraw Funds (close market)", async () => {});
  Carnival.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
