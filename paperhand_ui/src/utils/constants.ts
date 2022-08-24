import { PublicKey } from "@solana/web3.js";
import { Program, Wallet } from "@project-serum/anchor";

import { Exhibition, IDL as EXHIBITION_IDL } from "@/target/types/exhibition";
import { Shop, IDL as SHOP_IDL } from "@/target/types/shop";
import { Checkout, IDL as CHECKOUT_IDL } from "@/target/types/checkout";
import { Carnival, IDL as CARNIVAL_IDL } from "@/target/types/carnival";
import * as ExhibitionJson from "@/target/idl/exhibition.json";
import * as ShopJson from "@/target/idl/shop.json";
import * as CheckoutJson from "@/target/idl/checkout.json";
import * as CarnivalJson from "@/target/idl/carnival.json";
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
  let provider = await getProvider(wallet);
  let Shop = new Program(SHOP_IDL, SHOP_PROGRAM_ID, provider);
  return { Shop, provider };
}

export const CHECKOUT_PROGRAM_ID = new PublicKey(
  CheckoutJson["metadata"]["address"]
);

export async function getCheckoutProgramAndProvider(wallet: Wallet) {
  let provider = await getProvider(wallet);
  let Checkout = new Program(CHECKOUT_IDL, CHECKOUT_PROGRAM_ID, provider);
  return { Checkout, provider };
}

export const CARNIVAL_PROGRAM_ID = new PublicKey(
  CarnivalJson["metadata"]["address"]
);

export async function getCarnivalProgramAndProvider(wallet: Wallet) {
  let provider = await getProvider(wallet);
  let Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);
  return { Carnival, provider };
}
