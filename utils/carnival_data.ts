import { Nft } from "@metaplex-foundation/js";
import { Program } from "@project-serum/anchor";
import {
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
import { CARNIVAL_PROGRAM_ID } from "./constants";
import { IDL as CARNIVAL_IDL, Carnival } from "../target/types/carnival";
import { otherCreators, creator, users } from "../utils/constants";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getAllExhibitArtifacts } from "../floorbid_ui/src/utils/retrieveData";

export async function getPoolNfts(
  connection: Connection,
  exhibit: PublicKey,
  poolKey: PublicKey
): Promise<Nft[]> {
  let allArtifactAccounts = (
    await connection.getTokenAccountsByOwner(exhibit, {
      programId: TOKEN_PROGRAM_ID,
    })
  ).value;

  let poolNfts = [];

  return;
}
