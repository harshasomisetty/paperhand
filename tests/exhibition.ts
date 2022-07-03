import {
  bundlrStorage,
  createCreateMetadataAccountV2InstructionWithSigners,
  findMetadataPda,
  keypairIdentity,
  Metaplex,
  TransactionBuilder,
  BundlrStorageDriver,
} from "@metaplex-foundation/js";
import {
  Metadata,
  createSignMetadataInstruction,
} from "@metaplex-foundation/mpl-token-metadata";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
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
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import assert from "assert";
import { Exhibition } from "../target/types/exhibition";
import {
  AIRDROP_VALUE,
  APE_URIS,
  EXHIBITION_PROGRAM_ID,
} from "../utils/constants";
import {
  APE_SYMBOL,
  BEAR_SYMBOL,
  APE_URLS,
  BEAR_URLS,
  creator,
  otherCreators,
  user,
} from "../utils/constants";
import {
  initAssociatedAddressIfNeeded,
  getProcessedJsonData,
} from "../utils/actions";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const Exhibition = anchor.workspace.Exhibition as Program<Exhibition>;

const metaplex = Metaplex.make(provider.connection).use(
  keypairIdentity(creator)
);
async function getArtifactData(exhibit: PublicKey, mintKey: PublicKey) {
  let [nftArtifact] = await PublicKey.findProgramAddress(
    [Buffer.from("nft_artifact"), exhibit.toBuffer(), mintKey.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  let [artifactMetadata] = await PublicKey.findProgramAddress(
    [Buffer.from("artifact_metadata"), nftArtifact.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  return [nftArtifact, artifactMetadata];
}

async function getUserRedeemWallets(
  redeemMint: PublicKey,
  user
): Promise<PublicKey[]> {
  let userRedeemWallet = Array(2);

  userRedeemWallet[0] = await getAssociatedTokenAddress(
    redeemMint,
    user[0].publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  userRedeemWallet[1] = await getAssociatedTokenAddress(
    redeemMint,
    user[1].publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return userRedeemWallet;
}

describe("exhibition", () => {
  /*
    This test suite will involve 2 users, and consist of:
    1) First init a 2 nfts for 2 exhibits.
    2) Init the exhibit with parameters
    3) Have each user insert an NFT into the exhibit
    4) Fail user 1 from inserting an NFT from a wrong collection into this exhibit
    5) Have user 1 use a redeem token to withdraw an NFT
    6) Have user 1 fail to withdraw another NFT
    7) Verify that the exhibit still has 1 NFT, and ensure we can retrieve the NFT metadata
  */

  let creator2 = Keypair.generate();
  let jsonData = getProcessedJsonData();

  // let mintSize = jsonData.length;
  // let mintCount = jsonData[0].length;
  let mintSize = 2;
  let mintCount = 2;
  console.log("mint counts", mintSize, mintCount);
  let exhibitMints: PublicKey[][] = Array(mintCount);

  before("Init create and mint exhibits and Metadata", async () => {
    let airdropees = [creator, creator2, ...otherCreators, ...user];
    for (const dropee of airdropees) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          dropee.publicKey,
          AIRDROP_VALUE
        ),
        "confirmed"
      );
    }

    console.log("Creating and uploading NFTs...");
    for (let i = 0; i < mintSize; i++) {
      exhibitMints[i] = Array(mintSize);

      for (let j = 0; j < mintCount; j++) {
        console.log("loop", i, j);

        let mintKey = await createMint(
          connection,
          otherCreators[i],
          otherCreators[i].publicKey,
          otherCreators[i].publicKey,
          0
        );

        let associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          user[j],
          mintKey,
          user[j].publicKey
        );

        await mintTo(
          connection,
          user[j],
          mintKey,
          associatedTokenAccount.address,
          otherCreators[i],
          1
        );

        const metadata = findMetadataPda(mintKey);
        // console.log(i, j, "json data", jsonData[i][j], mintKey);
        let tx = TransactionBuilder.make().add(
          createCreateMetadataAccountV2InstructionWithSigners({
            data: jsonData[i][j],
            isMutable: false,
            mintAuthority: otherCreators[i],
            payer: otherCreators[i],
            mint: mintKey,
            metadata: metadata,
            updateAuthority: otherCreators[i].publicKey,
          })
        );

        await metaplex.rpc().sendAndConfirmTransaction(tx);

        let tx2 = new Transaction().add(
          createSignMetadataInstruction({
            metadata: metadata,
            creator: otherCreators[i].publicKey,
          })
        );

        await connection.sendTransaction(tx2, [otherCreators[i]]);

        const nft = await metaplex.nfts().findByMint(mintKey);

        exhibitMints[i][j] = mintKey;
      }
    }

    // Uncomment to print out all nft data.

    // for (let i = 0; i < mintCount; i++) {
    //   for (let j = 0; j < mintSize; j++) {
    //     console.log("printing ", i, j);
    //     let mintKey = exhibitMints[i][j];
    //     console.log("mint:", exhibitMints[i][j].toString());

    //     const nft = await metaplex.nfts().findByMint(mintKey);
    //     console.log("nft name", nft.metadata.symbol);

    //     let associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
    //       connection,
    //       user[j],
    //       mintKey,
    //       user[j].publicKey
    //     );

    //     let accountInfo = await getAccount(
    //       connection,
    //       associatedTokenAccount.address
    //     );

    //     console.log("token Baal: ", accountInfo.amount);
    //   }
    // }
  });

  it("Initialized exhibit!", async () => {
    let mintKey = exhibitMints[0][0];

    let exhibit = await getExhibitAddress(mintKey);
    console.log("exhibit print", exhibit.toString());
    const nft = await metaplex.nfts().findByMint(mintKey);

    let [redeemMint] = await PublicKey.findProgramAddress(
      [Buffer.from("redeem_mint"), exhibit.toBuffer()],
      EXHIBITION_PROGRAM_ID
    );

    let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      user[0],
      mintKey,
      user[0].publicKey
    );

    let tx = await Exhibition.methods
      .initializeExhibit()
      .accounts({
        exhibit: exhibit,
        redeemMint: redeemMint,
        nftMetadata: nft.metadataAccount.publicKey,
        creator: creator.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);

    let mdata = await Metadata.fromAccountAddress(
      connection,
      findMetadataPda(mintKey)
    );

    console.log("Exhibit 1: ", exhibit.toString());
    assert.ok(
      exhibitInfo.exhibitSymbol === mdata.data.symbol.replace(/\0.*$/g, "")
    );
  });

  it("Initialized exhibit 2!", async () => {
    console.log("INITIALIXED 2");
    let mintKey = exhibitMints[1][1];

    let exhibit = await getExhibitAddress(mintKey);
    const nft = await metaplex.nfts().findByMint(mintKey);
    let [redeemMint] = await PublicKey.findProgramAddress(
      [Buffer.from("redeem_mint"), exhibit.toBuffer()],
      EXHIBITION_PROGRAM_ID
    );

    let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      user[0],
      mintKey,
      user[0].publicKey
    );

    let tx = await Exhibition.methods
      .initializeExhibit()
      .accounts({
        exhibit: exhibit,
        redeemMint: redeemMint,
        nftMetadata: nft.metadataAccount.publicKey,
        creator: creator.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
    let mdata = await Metadata.fromAccountAddress(
      connection,
      findMetadataPda(mintKey)
    );

    console.log("Exhibit 2: ", exhibit.toString());
    assert.ok(
      exhibitInfo.exhibitSymbol === mdata.data.symbol.replace(/\0.*$/g, "")
    );
  });

  it("Inserted correct nft into corresponding artifact!", async () => {
    // Prep accounts for depositing first NFT.
    let exhibit = await getExhibitAddress(exhibitMints[0][0]);

    let mintKey = exhibitMints[0][0];

    const nft = await metaplex.nfts().findByMint(mintKey);

    let [nftArtifact, artifactMetadata] = await getArtifactData(
      exhibit,
      mintKey
    );

    let [redeemMint] = await PublicKey.findProgramAddress(
      [Buffer.from("redeem_mint"), exhibit.toBuffer()],
      EXHIBITION_PROGRAM_ID
    );

    let userRedeemWallet = await getUserRedeemWallets(redeemMint, user);
    let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      user[0],
      mintKey,
      user[0].publicKey
    );

    // create new user redeem token account outside of artifact insert
    await initAssociatedAddressIfNeeded(
      connection,
      userRedeemWallet[0],
      redeemMint,
      user[0]
    );

    console.log(
      "mint and Artifact 1",
      mintKey.toString(),
      nftArtifact.toString()
    );
    let tx = await Exhibition.methods
      .artifactInsert()
      .accounts({
        exhibit: exhibit,
        redeemMint: redeemMint,
        userRedeemWallet: userRedeemWallet[0],
        nftMint: mintKey,
        nftMetadata: nft.metadataAccount.publicKey,
        nftUserToken: nftUserTokenAccount.address,
        nftArtifact: nftArtifact,
        user: user[0].publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user[0]])
      .rpc();

    let postUserRedeemTokenBal = await getAccount(
      provider.connection,
      userRedeemWallet[0]
    );

    let postUserNftTokenBal = await getAccount(
      provider.connection,
      nftUserTokenAccount.address
    );

    let postNftArtifactBal = await getAccount(provider.connection, nftArtifact);

    let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);

    assert.ok(Number(postUserRedeemTokenBal.amount) == 1);
    assert.ok(Number(postUserNftTokenBal.amount) == 0);
    assert.ok(Number(postNftArtifactBal.amount) == 1);

    // Prepare accounts to deposit second nft.
  });

  it("inserted second nft from user 2", async () => {
    let mintKey = exhibitMints[0][1];

    let exhibit = await getExhibitAddress(mintKey);
    const nft = await metaplex.nfts().findByMint(mintKey);

    let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      user[1],
      mintKey,
      user[1].publicKey
    );

    let [nftArtifact, artifactMetadata] = await getArtifactData(
      exhibit,
      mintKey
    );

    let [redeemMint] = await PublicKey.findProgramAddress(
      [Buffer.from("redeem_mint"), exhibit.toBuffer()],
      EXHIBITION_PROGRAM_ID
    );

    console.log(
      "mint and Artifact 1",
      mintKey.toString(),
      nftArtifact.toString()
    );
    let userRedeemWallet = await getUserRedeemWallets(redeemMint, user);

    await initAssociatedAddressIfNeeded(
      connection,
      userRedeemWallet[1],
      redeemMint,
      user[1]
    );
    console.log("next tx");
    const tx = await Exhibition.methods
      .artifactInsert()
      .accounts({
        exhibit: exhibit,
        redeemMint: redeemMint,
        userRedeemWallet: userRedeemWallet[1],
        nftMint: mintKey,
        nftMetadata: nft.metadataAccount.publicKey,
        nftUserToken: nftUserTokenAccount.address,
        nftArtifact: nftArtifact,
        user: user[1].publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user[1]])
      .rpc();
  });

  it("Withdrew from artifact!", async () => {
    let mintKey = exhibitMints[0][0];

    let exhibit = await getExhibitAddress(mintKey);
    const nft = await metaplex.nfts().findByMint(mintKey);

    let [nftArtifact, artifactMetadata] = await getArtifactData(
      exhibit,
      mintKey
    );

    let [redeemMint] = await PublicKey.findProgramAddress(
      [Buffer.from("redeem_mint"), exhibit.toBuffer()],
      EXHIBITION_PROGRAM_ID
    );

    let userRedeemWallet = await getUserRedeemWallets(redeemMint, user);

    let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      user[0],
      mintKey,
      user[0].publicKey
    );

    const tx = await Exhibition.methods
      .artifactWithdraw()
      .accounts({
        exhibit: exhibit,
        redeemMint: redeemMint,
        user: user[0].publicKey,
        userRedeemWallet: userRedeemWallet[0],
        nftMint: mintKey,
        nftMetadata: nft.metadataAccount.publicKey,
        nftUserToken: nftUserTokenAccount.address,
        nftArtifact: nftArtifact,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user[0]])
      .rpc();

    let postUserRedeemTokenBal = await getAccount(
      provider.connection,
      userRedeemWallet[0]
    );
    assert.ok(Number(postUserRedeemTokenBal.amount) == 0);

    let postUserNftTokenBal = await getAccount(
      provider.connection,
      nftUserTokenAccount.address
    );
    assert.ok(Number(postUserNftTokenBal.amount) == 1);

    assert.ok((await connection.getAccountInfo(nftArtifact)) == null);
  });

  it("verify final nft artifacts simple", async () => {
    let mintKey = exhibitMints[0][0];
    let exhibit = await getExhibitAddress(mintKey);

    let [redeemMint] = await PublicKey.findProgramAddress(
      [Buffer.from("redeem_mint"), exhibit.toBuffer()],
      EXHIBITION_PROGRAM_ID
    );

    // ALL initialized exhibits
    let allExhibitAccounts = await connection.getProgramAccounts(
      EXHIBITION_PROGRAM_ID
    );
    allExhibitAccounts.forEach((key) => {
      console.log("exhibits", key.pubkey.toString());
    });

    let allArtifactAccounts = await connection.getTokenAccountsByOwner(
      exhibit,
      {
        programId: TOKEN_PROGRAM_ID,
      }
    );

    let artifactKeys = [];
    allArtifactAccounts.value.forEach((x, i) => {
      console.log("Artifact", x.pubkey.toString());
      artifactKeys.push(x.pubkey);
    });

    let redeemMintInfo = await getMint(connection, redeemMint);

    assert.ok(artifactKeys.length == Number(redeemMintInfo.supply));

    let artifactMints = [];
    artifactKeys.forEach(async (key, i) => {
      let tokenAccount = await getAccount(connection, key);
      console.log("TOKEN ACCOUNT", tokenAccount.mint.toString());
      artifactMints.push(tokenAccount.mint);
    });
  });

  Exhibition.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
