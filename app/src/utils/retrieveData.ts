import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, Connection } from "@solana/web3.js";

import { EXHIBITION_PROGRAM_ID } from "@/utils/constants";
import { Metaplex, Nft } from "@metaplex-foundation/js";

export async function getUserRedeemTokenBal(
  exhibit: PublicKey,
  publicKey: PublicKey | null,
  connection: Connection
): Promise<bigint> {
  let [redeemMint] = await PublicKey.findProgramAddress(
    [Buffer.from("redeem_mint"), exhibit.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  let userRedeemWallet = await getAssociatedTokenAddress(
    redeemMint,
    publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  let userRedeemTokenBal = await getAccount(connection, userRedeemWallet);
  return userRedeemTokenBal.amount;
}

export async function getAllExhibitArtifacts(
  exhibit: PublicKey,
  connection: Connection
): Promise<Nft[] | null> {
  const metaplex = Metaplex.make(connection);
  let allArtifactAccounts = (
    await connection.getTokenAccountsByOwner(exhibit, {
      programId: TOKEN_PROGRAM_ID,
    })
  ).value;

  let artifactMints = [];
  for (let i = 0; i < allArtifactAccounts.length; i++) {
    let tokenAccount = await getAccount(
      connection,
      allArtifactAccounts[i].pubkey
    );
    artifactMints.push(tokenAccount.mint);
  }

  let allNfts = await metaplex.nfts().findAllByMintList(artifactMints);
  return allNfts;
}

export async function getExhibitAddress(nft: Nft): Promise<PublicKey[]> {
  let seeds: Buffer[] = [];
  nft.creators?.forEach((creatorKey) => {
    if (creatorKey.verified) {
      // console.log("verified", creatorKey.address.toString());
      seeds.push(creatorKey.address.toBuffer());
    }
  });

  let [exhibit] = await PublicKey.findProgramAddress(
    [...seeds, Buffer.from("exhibit"), Buffer.from(nft.metadata?.symbol)],
    EXHIBITION_PROGRAM_ID
  );

  let [redeemMint] = await PublicKey.findProgramAddress(
    [Buffer.from("redeem_mint"), exhibit.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  return [exhibit, redeemMint];
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
  let [exhibit] = await getExhibitAddress(nft);
  let exhibitExists = await checkIfAccountExists(exhibit, connection);
  return exhibitExists;
}
