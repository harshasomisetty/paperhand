import { Nft } from "@metaplex-foundation/js";
import {
  Metadata,
  createSignMetadataInstruction,
  DataV2,
} from "@metaplex-foundation/mpl-token-metadata";
import { Provider, AnchorProvider } from "@project-serum/anchor";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  Signer,
  Connection,
} from "@solana/web3.js";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";

import { EXHIBITION_PROGRAM_ID } from "./constants";

import { creator, otherCreators } from "./constants";

export async function initAssociatedAddressIfNeeded(
  connection: Connection,
  wallet: PublicKey,
  mint: PublicKey,
  signer: Signer
) {
  let bal = await connection.getBalance(wallet);
  if (bal == 0) {
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        signer.publicKey,
        wallet,
        signer.publicKey,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    await sendAndConfirmTransaction(connection, transaction, [signer]);
  }
}

export async function getProvider(network: String, payer: Keypair) {
  /* provider allows  */
  /* create the provider and return it to the caller */
  /* network set to local network for now */

  let network_url = "http://localhost:8899";
  if (network === "localhost") {
    network_url = "http://localhost:8899";
  } else if (network === "devnet") {
    network_url = "https://api.devnet.solana.com";
  }

  const connection = new Connection(network_url, "confirmed");

  const provider: Provider = new AnchorProvider(
    connection,
    new NodeWallet(payer),
    {
      commitment: "confirmed",
      skipPreflight: true,
    }
  );
  await connection.requestAirdrop(payer.publicKey, 100e9);
  return provider;
}

export async function getExhibitAddress(nft: Nft): Promise<PublicKey[]> {
  let seeds = [];
  nft.creators.forEach((creatorKey) => {
    if (creatorKey.verified) {
      // console.log("verified", creatorKey.address.toString());
      seeds.push(creatorKey.address.toBuffer());
    }
  });

  let [exhibit, exhibitBump] = await PublicKey.findProgramAddress(
    [...seeds, Buffer.from("exhibit"), Buffer.from(nft.metadata.symbol)],
    EXHIBITION_PROGRAM_ID
  );

  let [redeemMint] = await PublicKey.findProgramAddress(
    [Buffer.from("redeem_mint"), exhibit.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  return [exhibit, redeemMint];
}

export async function getUserRedeemWallets(
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
