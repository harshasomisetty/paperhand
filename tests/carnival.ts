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
import { otherCreators, creator, users } from "../utils/constants";
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

    let [nftArtifact] = await PublicKey.findProgramAddress(
      [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
      Carnival.programId
    );

    let { carnival, carnivalAuth, carnivalAuthBump, escrowSol } =
      await getCarnivalAccounts(exhibit);

    let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      users[0],
      nft.mint,
      users[0].publicKey
    );
    console.log(
      exhibit.toString(),
      carnival.toString(),
      carnivalAuth.toString(),
      escrowSol.toString(),
      users[0].publicKey.toString()
    );
    await tryCatchWrap(
      Carnival.methods
        .initializeCarnival()
        .accounts({
          exhibit: exhibit,
          carnival: carnival,
          carnivalAuth: carnivalAuth,
          escrowSol: escrowSol,
          signer: users[0].publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([users[0]])
        .rpc()
    );
  });

  it("Made 2 sided market", async () => {
    // console.log("nft list", nftList);
    let solAmt = 2 * LAMPORTS_PER_SOL;

    let nftTransferList = [nftList[0][0], nftList[0][2], nftList[0][4]];

    let transaction = new Transaction();

    if (solAmt > 0) {
      let nft = nftTransferList[0];
      let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

      let [nftArtifact] = await PublicKey.findProgramAddress(
        [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
        Carnival.programId
      );

      let { carnival, carnivalAuth, carnivalAuthBump, escrowSol } =
        await getCarnivalAccounts(exhibit);

      transaction = transaction.add(
        Carnival.methods.depositSol(carnivalAuthBump).accounts({
          exhibit: exhibit,
          carnival: carnival,
          carnivalAuth: carnivalAuth,
          escrowSol: escrowSol,
          signer: users[0].publicKey,
          systemProgram: SystemProgram.programId,
        })
      );
    }

    for (let nft of nftTransferList) {
      let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

      let [nftArtifact] = await PublicKey.findProgramAddress(
        [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
        Carnival.programId
      );

      let { carnival, carnivalAuth, carnivalAuthBump } =
        await getCarnivalAccounts(exhibit);

      let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        users[0],
        nft.mint,
        users[0].publicKey
      );

      transaction = transaction.add(
        Carnival.methods.depositNft(carnivalAuthBump).accounts({
          exhibit: exhibit,
          carnival: carnival,
          carnivalAuth: carnivalAuth,
          nftMint: nft.mint,
          nftMetadata: nft.metadataAccount.publicKey,
          nftUserToken: nftUserTokenAccount.address,
          nftArtifact: nftArtifact,
          signer: users[0].publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
      );
      let postNftArtifact = await getAccount(provider.connection, nftArtifact);
      printAndTest(Number(postNftArtifact.amount), 1);
    }
  });

  // it("Made bid side market (only Sol)", async () => {});

  // it("Made ask side market (only nfts)", async () => {});

  // it("Buy Specific NFTs", async () => {});

  // it("Buy any NFTs", async () => {});

  // it("Sell some NFTs", async () => {});

  // it("Withdraw Funds (close pool)", async () => {});
});
