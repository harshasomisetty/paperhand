import { Connection, PublicKey } from "@solana/web3.js";
import { Program, Provider, web3, Wallet } from "@project-serum/anchor";

const opts = {
  preflightCommitment: "processed",
};

async function getProvider(wallet: Wallet, network: String) {
  /* create the provider and return it to the caller */
  /* network set to local network for now */

  let network_url = "http://localhost:8899";
  if (network === "localhost") {
    network_url = "http://localhost:8899";
  } else if (network === "devnet") {
    network_url = "https://api.devnet.solana.com";
  }

  const connection = new Connection(network_url, opts.preflightCommitment);

  const provider: Provider = new Provider(
    connection,
    wallet,
    opts.preflightCommitment
  );
  return provider;
}

export default getProvider;
