import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Connection,
} from "@solana/web3.js";

/* These are some keypairs to aid in testing, do not contain any real funds :) */

export const creator = Keypair.fromSecretKey(
  Uint8Array.from([
    140, 18, 16, 16, 137, 246, 73, 126, 96, 190, 34, 35, 93, 16, 130, 230, 60,
    233, 116, 131, 71, 216, 158, 242, 156, 78, 232, 253, 140, 68, 81, 71, 224,
    152, 113, 202, 9, 205, 92, 202, 39, 7, 120, 31, 125, 205, 18, 161, 16, 79,
    39, 2, 143, 249, 59, 147, 9, 190, 106, 218, 137, 233, 243, 153,
  ])
);

export const otherCreators = [
  Keypair.fromSecretKey(
    Uint8Array.from([
      31, 52, 115, 252, 12, 13, 62, 55, 133, 131, 81, 61, 38, 175, 253, 204, 23,
      243, 180, 180, 178, 226, 104, 78, 159, 148, 142, 175, 196, 235, 36, 126,
      152, 221, 121, 167, 51, 182, 58, 234, 217, 94, 189, 11, 99, 3, 16, 247,
      158, 79, 107, 219, 232, 168, 90, 107, 250, 151, 54, 211, 93, 147, 42, 115,
    ])
  ),
  Keypair.fromSecretKey(
    Uint8Array.from([
      245, 26, 149, 17, 60, 172, 218, 154, 22, 153, 234, 38, 117, 77, 135, 114,
      180, 180, 99, 108, 124, 53, 138, 68, 214, 24, 10, 177, 230, 82, 179, 180,
      199, 61, 211, 236, 239, 118, 196, 83, 37, 232, 5, 136, 162, 106, 58, 0,
      58, 111, 99, 165, 124, 118, 227, 215, 69, 169, 194, 248, 101, 52, 206,
      148,
    ])
  ),
];

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

const Exhibition = require("../target/idl/exhibition.json");
export let EXHIBITION_PROGRAM_ID = new PublicKey(
  Exhibition["metadata"]["address"]
);

const Bazaar = require("../target/idl/bazaar.json");
export let BAZAAR_PROGRAM_ID = new PublicKey(Bazaar["metadata"]["address"]);

// export let APE_URLS = [
//   "https://arweave.net/70WuipZgUbiibV9_qfDN_2b12-21ocDLU0fn1sS4CPs",
//   "https://arweave.net/pQC8oVliOJl1AmxlWpFiQ_VkhWDLFkkRY2fWDgvwUao",
//   "https://arweave.net/k9PdPHHKjWEUliBwWBZpYbOG99Fgl8tQa8onI1GCnvA",
//   "https://arweave.net/WDKNBqirJVVxa61G8FusAxKDR7P_NBWZVX26A8pCDvU",
//   "https://arweave.net/rmdT61h7-vi3W9wzb3_eQMmLU5Yv6aPbBygzvg29ha0",
//   "https://arweave.net/THn3kuBgloKL0i0mZavWqBwxShMCG12Gvv3IF2gEHlw",
//   "https://arweave.net/ITslXlK-HX1UcJIfYKTpXViksZQJZUOIzcVKHuH6NuM",
//   "https://arweave.net/NMigWBU7F1Qf69VHfm6O8vNGkblieqvsMej2abupoy4",
//   "https://arweave.net/s30Qhgt-OTBSno49g4_x4ovfHEiUGJO5anltemHfIQ8",
// ];

export let APE_URLS: string[] = [
  "https://arweave.net/EbjdIwucGdm6wAdnOEVPdmFUgebLSQ8kQOSkpk6niJY",
  "https://arweave.net/JPjUvsXtZp5zqPt9f5HNwkDmwf1-efDE0nK_M_gO_b4",
  "https://arweave.net/RnCnZ7ILuoFDRTIapjZhyf3pask4vlFGhqsDbqrCFEQ",
  "https://arweave.net/o8Ed5KaIEhcZtv5P78LqaaF_TEDC0cHOHmAcKKOK6wc",
  "https://arweave.net/ATgVBjGiNkODVR8kIaJRgUWjn2ALtc3o-ds3sJ_yDOU",
];

export let APE_URIS: string[] = [
  "https://arweave.net/-8hG7nLuNJn_55vHEH6GjwaBL7Nq6GKTDma4TMVbduo",
  "https://arweave.net/TbLV-wcVcVvvniZ6p4nXGMUWk4HwEt4g_ynmf08V6E8",
  "https://arweave.net/5EQz8jwR4hnAHhjLNmx7Q_JjIZinsO8JC-ntU4lEnDU",
  "https://arweave.net/GJZyNgig1j8gDYl2ysW3OylIyR6nEtkKNYRr21c6LVA",
  "https://arweave.net/bRQh93qZ1C22oeC50jDqRvRsjlNLH-vZ3aYRmsMDikk",
];

export let BEAR_URLS: string[] = [
  "https://bafybeihkmuvb6o3qdwdinnxkm2otiojvupk22cbuw2tavx5v553wpnzdxy.ipfs.nftstorage.link/9047.png?ext=png",
  "https://bafybeietzgnye5brkhuzpittobj2r7nxs7e24mjjvres4yguucpzroy7re.ipfs.nftstorage.link/5892.png?ext=png",
  "https://bafybeidvp5n3f3rn2hst4jpcvdds2qhcx6clrf4cfxaoeihobqoaknmxq4.ipfs.nftstorage.link/7310.png?ext=png",
  "https://bafybeihgwnmpu3hutpufktognzt3xodrm5dct2h3y6mvj2l35rpk5r7uxu.ipfs.nftstorage.link/1418.png?ext=png",
  "https://bafybeiftdsew6qc3cswplkocczi2tz5vhstcb76gblrfydvaoap65pz44y.ipfs.nftstorage.link/4610.png?ext=png",
];

export let BEAR_URIS: string[] = [
  "https://arweave.net/_IikG0bLJqWyEm239TgWqDt5B-lNPpVE7hEiQoZRFVk",
  "https://arweave.net/w6gvMH9WZeReCBrawbnu27wwoJOIgv2GFoCyHw96-As",
  "https://arweave.net/Yq1bFVlX4B8ixVFcvTffKHtYFzweLIG0z1dCf7BekBM",
  "https://arweave.net/r-K2mzrwzpygiMx7n7lGadd_XHq_02-olGZK7MUrUy4",
  "https://arweave.net/8J7NeeZvDdYQM758B9smMSoR43VS2ZH9nNnwpXWMQu4",
];

export let APE_SYMBOL: string = "APE";
export let BEAR_SYMBOL: string = "BEAR";

export let AIRDROP_VALUE = 20 * LAMPORTS_PER_SOL;
