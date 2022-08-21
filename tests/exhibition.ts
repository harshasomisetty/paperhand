import { keypairIdentity, Metaplex, Nft } from "@metaplex-foundation/js";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getMint,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { Exhibition } from "../target/types/exhibition";
import {
  getUserVoucherWallets,
  initAssociatedAddressIfNeeded,
} from "../utils/actions";
import {
  creator,
  EXHIBITION_PROGRAM_ID,
  otherCreators,
  users,
} from "../utils/constants";
import { mintNFTs } from "../utils/createNFTs";
import { airdropAll, printAndTest } from "../utils/helpfulFunctions";

import { getNftDerivedAddresses } from "../utils/accountDerivation";
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const Exhibition = anchor.workspace.Exhibition as Program<Exhibition>;

const metaplex = Metaplex.make(provider.connection).use(
  keypairIdentity(creator)
);

// in seperate function
describe("exhibition", () => {
  /*
    This test suite will involve 2 users, and consist of:
    1) First init a 2 nfts for 2 exhibits.
    2) Init the exhibit with parameters
    3) Have each user insert an NFT into the exhibit
    4) Fail user 1 from inserting an NFT from a wrong collection into this exhibit
    5) Have user 1 use a voucher token to withdraw an NFT
    6) Have user 1 fail to withdraw another NFT
    7) Verify that the exhibit still has 1 NFT, and ensure we can retrieve the NFT metadata
  */

  let mintCollectionCount = 2;
  let mintNftCount = 2;
  let nftList: Nft[][] = Array(mintCollectionCount);

  let airdropVal = 20 * LAMPORTS_PER_SOL;
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

  it("Initialized exhibit!", async () => {
    let nft = nftList[0][0];
    let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

    let tx = await Exhibition.methods
      .initializeExhibit()
      .accounts({
        exhibit: exhibit,
        voucherMint: voucherMint,
        nftMetadata: nft.metadataAccount.publicKey,
        signer: creator.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);

    printAndTest(exhibitInfo.exhibitSymbol, nft.symbol.replace(/\0.*$/g, ""));
  });

  it("Initialized exhibit 2!", async () => {
    let nft = nftList[1][1];
    let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

    let tx = await Exhibition.methods
      .initializeExhibit()
      .accounts({
        exhibit: exhibit,
        voucherMint: voucherMint,
        nftMetadata: nft.metadataAccount.publicKey,
        signer: creator.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);

    printAndTest(exhibitInfo.exhibitSymbol, nft.symbol.replace(/\0.*$/g, ""));
    printAndTest(exhibitInfo.artifactCount, 0);
  });

  it("Inserted correct nft into corresponding artifact!", async () => {
    // Prep accounts for depositing first NFT.

    let nft = nftList[0][0];
    let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

    let [nftArtifact] = await PublicKey.findProgramAddress(
      [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
      EXHIBITION_PROGRAM_ID
    );

    let userVoucherWallet = await getUserVoucherWallets(voucherMint, users);
    let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      users[0],
      nft.mint,
      users[0].publicKey
    );

    // create new user voucher token account outside of artifact insert
    await initAssociatedAddressIfNeeded(
      connection,
      userVoucherWallet[0],
      voucherMint,
      users[0]
    );

    let tx = await Exhibition.methods
      .artifactInsert()
      .accounts({
        exhibit: exhibit,
        voucherMint: voucherMint,
        userVoucherWallet: userVoucherWallet[0],
        nftMint: nft.mint,
        nftMetadata: nft.metadataAccount.publicKey,
        nftUserToken: nftUserTokenAccount.address,
        nftArtifact: nftArtifact,
        delegateSigner: users[0].publicKey,
        signer: users[0].publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([users[0]])
      .rpc();

    let postUserVoucherTokenBal = await getAccount(
      provider.connection,
      userVoucherWallet[0]
    );

    let postUserNftTokenBal = await getAccount(
      provider.connection,
      nftUserTokenAccount.address
    );

    let postNftArtifactBal = await getAccount(provider.connection, nftArtifact);

    printAndTest(
      users[0].publicKey.toString(),
      postNftArtifactBal.delegate.toString(),
      "delegates test"
    );

    let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);

    printAndTest(Number(postUserVoucherTokenBal.amount), 1);
    printAndTest(Number(postUserNftTokenBal.amount), 0);
    printAndTest(Number(postNftArtifactBal.amount), 1);
    printAndTest(exhibitInfo.artifactCount, 1);
  });

  it("inserted second nft from user 2", async () => {
    let nft = nftList[0][1];
    let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

    let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      users[1],
      nft.mint,
      users[1].publicKey
    );

    let [nftArtifact] = await PublicKey.findProgramAddress(
      [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
      EXHIBITION_PROGRAM_ID
    );

    let userVoucherWallet = await getUserVoucherWallets(voucherMint, users);

    await initAssociatedAddressIfNeeded(
      connection,
      userVoucherWallet[1],
      voucherMint,
      users[1]
    );

    const tx = await Exhibition.methods
      .artifactInsert()
      .accounts({
        exhibit: exhibit,
        voucherMint: voucherMint,
        userVoucherWallet: userVoucherWallet[1],
        nftMint: nft.mint,
        nftMetadata: nft.metadataAccount.publicKey,
        nftUserToken: nftUserTokenAccount.address,
        nftArtifact: nftArtifact,
        delegateSigner: users[1].publicKey,
        signer: users[1].publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([users[1]])
      .rpc();
  });

  it("Withdrew from artifact!", async () => {
    let nft = nftList[0][0];
    let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

    let [nftArtifact] = await PublicKey.findProgramAddress(
      [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
      EXHIBITION_PROGRAM_ID
    );

    let userVoucherWallet = await getUserVoucherWallets(voucherMint, users);

    let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      users[0],
      nft.mint,
      users[0].publicKey
    );

    try {
      const tx = await Exhibition.methods
        .artifactWithdraw()
        .accounts({
          exhibit: exhibit,
          voucherMint: voucherMint,
          userVoucherWallet: userVoucherWallet[0],
          nftMint: nft.mint,
          nftMetadata: nft.metadataAccount.publicKey,
          nftUserToken: nftUserTokenAccount.address,
          nftArtifact: nftArtifact,
          signer: users[0].publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([users[0]])
        .rpc();
    } catch (error) {
      console.log("withdraw error", error);
    }

    let postUserVoucherTokenBal = await getAccount(
      provider.connection,
      userVoucherWallet[0]
    );

    let postUserNftTokenBal = await getAccount(
      provider.connection,
      nftUserTokenAccount.address
    );

    let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);

    printAndTest(exhibitInfo.artifactCount, 1);

    printAndTest(Number(postUserVoucherTokenBal.amount), 0);
    printAndTest(Number(postUserNftTokenBal.amount), 1);
    printAndTest(await connection.getAccountInfo(nftArtifact), null);
  });

  it("verify final nft artifacts simple", async () => {
    let nft = nftList[0][0];
    let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

    // ALL initialized exhibits
    let allArtifactAccounts = await connection.getTokenAccountsByOwner(
      exhibit,
      {
        programId: TOKEN_PROGRAM_ID,
      }
    );

    let artifactKeys = [];
    allArtifactAccounts.value.forEach((x, i) => {
      // console.log("Artifact", x.pubkey.toString());
      artifactKeys.push(x.pubkey);
    });

    let voucherMintInfo = await getMint(connection, voucherMint);

    printAndTest(artifactKeys.length, Number(voucherMintInfo.supply));

    let artifactMints = [];
    artifactKeys.forEach(async (key, i) => {
      let tokenAccount = await getAccount(connection, key);
      artifactMints.push(tokenAccount.mint);
    });
  });

  Exhibition.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
