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
import { getNftDerivedAddresses } from "../utils/accountDerivation";
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
  let airdropVal = 20 * LAMPORTS_PER_SOL;

  let mintCollectionCount = 1;
  let mintNftCount = 10;

  let nftList: Nft[][] = Array(mintNftCount);

  let carnivalKeypair: Keypair = Keypair.generate();
  let carnival: PublicKey = carnivalKeypair.publicKey;
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

    let [carnivalAuth, carnivalAuthBump] = await PublicKey.findProgramAddress(
      [Buffer.from("carnival_auth"), carnival.toBuffer()],
      Carnival.programId
    );

    let [escrowSol] = await PublicKey.findProgramAddress(
      [Buffer.from("escrow_sol"), exhibit.toBuffer()],
      Carnival.programId
    );

    let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      users[0],
      nft.mint,
      users[0].publicKey
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

  it("Change NFT auth", async () => {
    console.log("nft list", nftList);
    let nft = nftList[0][0];

    let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

    let [nftArtifact] = await PublicKey.findProgramAddress(
      [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
      Carnival.programId
    );

    let [carnivalAuth, carnivalAuthBump] = await PublicKey.findProgramAddress(
      [Buffer.from("carnival_auth"), carnival.toBuffer()],
      Carnival.programId
    );

    let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      users[0],
      nft.mint,
      users[0].publicKey
    );

    await tryCatchWrap(
      Carnival.methods
        .depositNft(carnivalAuthBump)
        .accounts({
          exhibit: exhibit,
          carnival: carnival,
          carnivalAuth: carnivalAuth,
          // voucherMint: voucherMint,
          // userVoucherWallet: userVoucherWallet[0],
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
        .signers([users[0]])
        .rpc()
    );

    let postNftArtifact = await getAccount(provider.connection, nftArtifact);
    printAndTest(Number(postNftArtifact.amount), 1);
    printAndTest(
      users[0].publicKey.toString(),
      postNftArtifact.delegate.toString()
    );
  });

  // it("Made 2 sided market", async () => {
  //   // check delegates
  // });

  // it("Made bid side market (only Sol)", async () => {});

  // it("Made ask side market (only nfts)", async () => {});

  // it("Buy Specific NFTs", async () => {});

  // it("Buy any NFTs", async () => {});

  // it("Sell some NFTs", async () => {});

  // it("Withdraw Funds (close pool)", async () => {});
});
