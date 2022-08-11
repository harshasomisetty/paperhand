import { PublicKey } from "@solana/web3.js";
import { Program, Wallet } from "@project-serum/anchor";

import { Exhibition, IDL as EXHIBITION_IDL } from "@/target/types/exhibition";
import { Bazaar, IDL as BAZAAR_IDL } from "@/target/types/bazaar";
import * as ExhibitionJson from "@/target/idl/exhibition.json";
import * as BazaarJson from "@/target/idl/bazaar.json";
import { getProvider } from "@/utils/provider";

export const EXHIBITION_PROGRAM_ID = new PublicKey(
  ExhibitionJson["metadata"]["address"]
);

export async function getExhibitProgramAndProvider(wallet: Wallet) {
  let provider = await getProvider(wallet);
  let Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);
  return { Exhibition, provider };
}

export const BAZAAR_PROGRAM_ID = new PublicKey(
  BazaarJson["metadata"]["address"]
);

export async function getBazaarProgramAndProvider(wallet: Wallet) {
  let provider = await getProvider(wallet);
  let Bazaar = new Program(BAZAAR_IDL, BAZAAR_PROGRAM_ID, provider);
  return { Bazaar, provider };
}
