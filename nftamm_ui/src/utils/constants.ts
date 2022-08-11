import { PublicKey } from "@solana/web3.js";
import { Program, Wallet } from "@project-serum/anchor";

import { Exhibition, IDL as EXHIBITION_IDL } from "@/target/types/exhibition";
import { Shop, IDL as SHOP_IDL } from "@/target/types/shop";
import * as ExhibitionJson from "@/target/idl/exhibition.json";
import * as ShopJson from "@/target/idl/shop.json";
import { getProvider } from "@/utils/provider";

export const EXHIBITION_PROGRAM_ID = new PublicKey(
  ExhibitionJson["metadata"]["address"]
);

export async function getExhibitProgramAndProvider(wallet: Wallet) {
  let provider = await getProvider(wallet);
  let Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);
  return { Exhibition, provider };
}

export const SHOP_PROGRAM_ID = new PublicKey(ShopJson["metadata"]["address"]);

export async function getShopProgramAndProvider(wallet: Wallet) {
  console.log("in get shop and program");
  let provider = await getProvider(wallet);
  console.log("got provider");
  let Shop = new Program(SHOP_IDL, SHOP_PROGRAM_ID, provider);
  console.log("made shop");
  return { Shop, provider };
}
