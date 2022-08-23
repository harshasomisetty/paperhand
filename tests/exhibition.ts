import { keypairIdentity, Metaplex, Nft } from "@metaplex-foundation/js";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
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
import { initAssociatedAddressIfNeeded } from "../utils/actions";
import {
  APE_URIS,
  BEAR_URIS,
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

const metaplex = Metaplex.make(connection).use(keypairIdentity(creator));

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

  let nftList: Nft[][] = [];

  let airdropVal = 20 * LAMPORTS_PER_SOL;
  before("Init create and mint exhibits and Metadata", async () => {
    let airdropees = [creator, ...otherCreators, ...users];

    await airdropAll(airdropees, airdropVal, connection);

    nftList.push(
      await mintNFTs(
        metaplex,
        connection,
        APE_URIS.splice(0, 2),
        otherCreators[0],
        [users[0].publicKey, users[1].publicKey]
      )
    );
    nftList.push(
      await mintNFTs(
        metaplex,
        connection,
        BEAR_URIS.splice(0, 2),
        otherCreators[1],
        [users[0].publicKey, users[1].publicKey]
      )
    );
  });

  it("Initialized exhibits!", async () => {
    let nfts = [nftList[0][0], nftList[1][1]];

    for (let nft of nfts) {
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
    }
  });

  it("Insert NFT 1 into Exhibit 1, no delegate!", async () => {
    // Prep accounts for depositing first NFT.

    let nft = nftList[0][0];

    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nft
    );

    let userVoucherWallet = await getAssociatedTokenAddress(
      voucherMint,
      users[0].publicKey
    );

    let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      users[0],
      nft.mint,
      users[0].publicKey
    );

    await initAssociatedAddressIfNeeded(
      connection,
      userVoucherWallet,
      voucherMint,
      users[0]
    );

    let tx = await Exhibition.methods
      .artifactInsert()
      .accounts({
        exhibit: exhibit,
        voucherMint: voucherMint,
        userVoucherWallet: userVoucherWallet,
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

    printAndTest(
      Number((await getAccount(connection, userVoucherWallet)).amount),
      1,
      "user has voucher"
    );

    printAndTest(
      Number(
        (await getAccount(connection, nftUserTokenAccount.address)).amount
      ),
      0,
      "moved nft from user to exhibit"
    );

    printAndTest(
      Number((await getAccount(connection, nftArtifact)).amount),
      1,
      "exhibit has nft"
    );

    printAndTest(
      (await Exhibition.account.exhibit.fetch(exhibit)).artifactCount,
      1,
      "Exhibit has 1 total nft"
    );
  });

  it("inserted second nft from user1, user0 as delegate", async () => {
    let nft = nftList[0][1];
    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nft
    );

    let userVoucherWallet = await getAssociatedTokenAddress(
      voucherMint,
      users[1].publicKey
    );

    let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      users[1],
      nft.mint,
      users[1].publicKey
    );

    await initAssociatedAddressIfNeeded(
      connection,
      userVoucherWallet,
      voucherMint,
      users[1]
    );

    const tx = await Exhibition.methods
      .artifactInsert()
      .accounts({
        exhibit: exhibit,
        voucherMint: voucherMint,
        userVoucherWallet: userVoucherWallet,
        nftMint: nft.mint,
        nftMetadata: nft.metadataAccount.publicKey,
        nftUserToken: nftUserTokenAccount.address,
        nftArtifact: nftArtifact,
        delegateSigner: users[0].publicKey,
        signer: users[1].publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([users[0], users[1]])
      .rpc();

    printAndTest(
      Number((await getAccount(connection, userVoucherWallet)).amount),
      0,
      "User has no voucher since has delegate"
    );

    printAndTest(
      users[0].publicKey.toString(),
      (await getAccount(connection, nftArtifact)).delegate.toString(),
      "User 0 is delegate test"
    );

    printAndTest(
      Number(
        (await getAccount(connection, nftUserTokenAccount.address)).amount
      ),
      0,
      "moved nft from user to exhibit"
    );

    printAndTest(
      Number((await getAccount(connection, nftArtifact)).amount),
      1,
      "exhibit has nft"
    );

    printAndTest(
      (await Exhibition.account.exhibit.fetch(exhibit)).artifactCount,
      2,
      "Exhibit has 2 total nft"
    );
  });

  it("Withdrew artifact 1!", async () => {
    let nft = nftList[0][0];
    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nft
    );

    let userVoucherWallet = await getAssociatedTokenAddress(
      voucherMint,
      users[0].publicKey
    );

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
          userVoucherWallet: userVoucherWallet,
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
      connection,
      userVoucherWallet
    );

    let postUserNftTokenBal = await getAccount(
      connection,
      nftUserTokenAccount.address
    );

    let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);

    printAndTest(Number(postUserVoucherTokenBal.amount), 0, "Voucher redeemed");
    printAndTest(Number(postUserNftTokenBal.amount), 1, "User has nft");
    printAndTest(
      await connection.getAccountInfo(nftArtifact),
      null,
      "Artifact account closed"
    );
    printAndTest(exhibitInfo.artifactCount, 1, "One artifact left");
  });

  it("Failed withdraw artifact 2!", async () => {
    let nft = nftList[0][1];
    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nft
    );

    let userVoucherWallet = await getAssociatedTokenAddress(
      voucherMint,
      users[1].publicKey
    );

    let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      users[1],
      nft.mint,
      users[1].publicKey
    );

    try {
      const tx = await Exhibition.methods
        .artifactWithdraw()
        .accounts({
          exhibit: exhibit,
          voucherMint: voucherMint,
          userVoucherWallet: userVoucherWallet,
          nftMint: nft.mint,
          nftMetadata: nft.metadataAccount.publicKey,
          nftUserToken: nftUserTokenAccount.address,
          nftArtifact: nftArtifact,
          signer: users[1].publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([users[1]])
        .rpc();
    } catch (error) {
      console.log("NFT is delegated", error);
    }

    let postUserVoucherTokenBal = await getAccount(
      connection,
      userVoucherWallet
    );

    let postUserNftTokenBal = await getAccount(
      connection,
      nftUserTokenAccount.address
    );

    let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);

    printAndTest(
      users[0].publicKey.toString(),
      (await getAccount(connection, nftArtifact)).delegate.toString(),
      "User 0 is still delegate test"
    );

    printAndTest(Number(postUserNftTokenBal.amount), 0);
    printAndTest(exhibitInfo.artifactCount, 1);
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
      artifactKeys.push(x.pubkey);
    });

    let voucherMintInfo = await getMint(connection, voucherMint);

    // find better way to check nfts remaining, for now its just 1, since withdrew one, failed another (no voucher since delegated)
    printAndTest(artifactKeys.length, 1);

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
