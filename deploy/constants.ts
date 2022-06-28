import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Connection,
} from "@solana/web3.js";

// const fs = require("fs");
export const creator = Keypair.fromSecretKey(
  Uint8Array.from([
    140, 18, 16, 16, 137, 246, 73, 126, 96, 190, 34, 35, 93, 16, 130, 230, 60,
    233, 116, 131, 71, 216, 158, 242, 156, 78, 232, 253, 140, 68, 81, 71, 224,
    152, 113, 202, 9, 205, 92, 202, 39, 7, 120, 31, 125, 205, 18, 161, 16, 79,
    39, 2, 143, 249, 59, 147, 9, 190, 106, 218, 137, 233, 243, 153,
  ])
);
// JSON.parse(
// fs.readFileSync("/Users/harshasomisetty/.config/solana/creator.json")
// )

export const user = [
  Keypair.fromSecretKey(
    Uint8Array.from([
      243, 175, 79, 103, 190, 63, 200, 29, 117, 225, 114, 71, 25, 77, 208, 231,
      64, 95, 33, 108, 135, 1, 92, 86, 133, 198, 34, 155, 45, 157, 162, 101,
      151, 33, 127, 187, 68, 123, 53, 59, 87, 215, 205, 73, 203, 219, 55, 161,
      59, 117, 211, 172, 16, 107, 235, 189, 241, 189, 222, 70, 35, 117, 194,
      222,
    ])
  ),
  Keypair.fromSecretKey(
    Uint8Array.from([
      37, 243, 162, 101, 33, 131, 154, 96, 184, 2, 212, 88, 50, 65, 196, 227,
      247, 29, 181, 93, 178, 186, 166, 255, 239, 12, 105, 13, 19, 67, 220, 106,
      64, 145, 44, 208, 19, 98, 99, 212, 57, 116, 184, 197, 170, 65, 108, 231,
      172, 220, 56, 37, 114, 221, 52, 162, 221, 177, 250, 148, 159, 86, 173, 41,
    ])
  ),
];

// JSON.parse(
//   fs.readFileSync("/Users/harshasomisetty/.config/solana/user1.json")
// )
// JSON.parse(
//   fs.readFileSync("/Users/harshasomisetty/.config/solana/user2.json")
// )
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
