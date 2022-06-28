import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Connection,
} from "@solana/web3.js";

const fs = require("fs");
export const creator: Keypair = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync("/Users/harshasomisetty/.config/solana/creator.json")
    )
  )
);

export const user: Keypair[] = [
  Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        fs.readFileSync("/Users/harshasomisetty/.config/solana/user1.json")
      )
    )
  ),
  Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        fs.readFileSync("/Users/harshasomisetty/.config/solana/user2.json")
      )
    )
  ),
];

const exhibition = require("../target/idl/exhibition.json");
export let EXHIBITION_PROGRAM_ID = new PublicKey(
  exhibition["metadata"]["address"]
);

const bazaar = require("../target/idl/bazaar.json");
export let BAZAAR_PROGRAM_ID = new PublicKey(bazaar["metadata"]["address"]);

export let arweave_urls = [
  "https://arweave.net/70WuipZgUbiibV9_qfDN_2b12-21ocDLU0fn1sS4CPs",
  "https://arweave.net/pQC8oVliOJl1AmxlWpFiQ_VkhWDLFkkRY2fWDgvwUao",
  "https://arweave.net/k9PdPHHKjWEUliBwWBZpYbOG99Fgl8tQa8onI1GCnvA",
  "https://arweave.net/WDKNBqirJVVxa61G8FusAxKDR7P_NBWZVX26A8pCDvU",
  "https://arweave.net/rmdT61h7-vi3W9wzb3_eQMmLU5Yv6aPbBygzvg29ha0",
  "https://arweave.net/THn3kuBgloKL0i0mZavWqBwxShMCG12Gvv3IF2gEHlw",
  "https://arweave.net/ITslXlK-HX1UcJIfYKTpXViksZQJZUOIzcVKHuH6NuM",
  "https://arweave.net/NMigWBU7F1Qf69VHfm6O8vNGkblieqvsMej2abupoy4",
  "https://arweave.net/s30Qhgt-OTBSno49g4_x4ovfHEiUGJO5anltemHfIQ8",
];
