import {Connection, programs} from "@metaplex/js";
const {
  metadata: {Metadata},
} = programs;

const connection = new Connection("devnet");
const tokenPublicKey = "5CT8EbCVgfmZREWtCyA768sjWJPRfMcRfbowg58Y5Dor";

const run = async () => {
  try {
    const ownedMetadata = await Metadata.load(connection, tokenPublicKey);
    console.log(ownedMetadata);
  } catch {
    console.log("Failed to fetch metadata");
  }
};

run();
