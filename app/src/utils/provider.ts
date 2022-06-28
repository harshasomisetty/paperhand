import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import {
  Program,
  Provider,
  AnchorProvider,
  web3,
  Wallet,
} from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
const opts = {
  commitment: "confirmed",
  skipPreflight: true,
};

async function getProvider(network: String, payer: Keypair) {
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
export default getProvider;
