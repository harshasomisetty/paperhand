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
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  Signer,
  Connection,
} from "@solana/web3.js";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";

import {
  getNftDerivedAddresses,
  getShopAccounts,
  getCheckoutAccounts,
} from "../utils/accountDerivation";

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

export async function checkIfAccountExists(
  account: PublicKey,
  connection: Connection
): Promise<Boolean> {
  let bal = await connection.getBalance(account);
  if (bal > 0) {
    return true;
  } else {
    return false;
  }
}

export async function checkIfExhibitExists(
  nft: Nft,
  connection: Connection
): Promise<Boolean> {
  let { exhibit } = await getNftDerivedAddresses(nft);
  let exhibitExists = await checkIfAccountExists(exhibit, connection);
  return exhibitExists;
}
