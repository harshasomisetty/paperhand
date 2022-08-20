import { Nft } from "@metaplex-foundation/js";
import { Program } from "@project-serum/anchor";
import {
  AccountInfo,
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  getCarnivalAccounts,
  getNftDerivedAddresses,
} from "./accountDerivation";
import { checkIfAccountExists, getProvider } from "./actions";
import { CARNIVAL_PROGRAM_ID, EXHIBITION_PROGRAM_ID } from "./constants";
import { IDL as CARNIVAL_IDL, Carnival } from "../target/types/carnival";
import { otherCreators, creator, users } from "../utils/constants";
import {
  Account,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getAllExhibitArtifacts } from "../floorbid_ui/src/utils/retrieveData";

export async function getAllMarkets(
  connection: Connection,
  exhibit: PublicKey
): Promise<
  Array<{
    pubkey: PublicKey;
    account: AccountInfo<Buffer>;
  }>
> {
  let { carnival, carnivalAuth, carnivalAuthBump, escrowSol } =
    await getCarnivalAccounts(exhibit);

  let allMarketAccounts = await connection.getTokenAccountsByOwner(carnival, {
    programId: TOKEN_PROGRAM_ID,
  });

  return allMarketAccounts;
}

export async function getMarketNfts(
  connection: Connection,
  exhibit: PublicKey,
  marketKey: PublicKey
): Promise<PublicKey[]> {
  let allArtifactAccounts = (
    await connection.getParsedTokenAccountsByOwner(exhibit, {
      programId: TOKEN_PROGRAM_ID,
    })
  ).value;

  let marketNfts = [];

  for (let account of allArtifactAccounts) {
    marketNfts.push(new PublicKey(account.account.data.parsed.info.delegate));
  }

  return marketNfts;
}
