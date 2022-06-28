import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Connection,
  AccountInfo,
} from "@solana/web3.js";
import { useState, useEffect } from "react";
import ProjectList from "../../../components/ProjectList";
import EXHIBITION_IDL from "../../exhibitIdl.json";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { EXHIBITION_PROGRAM_ID } from "../../../../../deploy/constants";

import { creatorAdd, exhibitNames } from "../../../utils/data";

import { Program } from "@project-serum/anchor";
import { getProvider } from "../../../utils/provider";
const connection = new Connection("http://localhost:8899", "processed");
const ExploreProjects = () => {
  const [exhibit, setExhibit] = useState();
  const { wallet, publicKey, sendTransaction } = useWallet();
  const router = useRouter();
  const { symbol, name } = router.query;

  useEffect(() => {
    async function fetchData() {
      // let provider = await getProvider("http://localhost:8899", creator);
      // let provider = await getProvider(wallet);
      // let Exhibition = new Program(
      //   EXHIBITION_IDL,
      //   EXHIBITION_PROGRAM_ID,
      //   provider
      // );
      // let existingExhibits: PublicKey[] = [];
      // let [exhibit, exhibitBump] = await PublicKey.findProgramAddress(
      //   [Buffer.from("exhibit"), Buffer.from(symbol), creatorAdd.toBuffer()],
      //   EXHIBITION_PROGRAM_ID
      // );

      // let exhibitBal = await connection.getBalance(exhibit);
      // if (exhibitBal > 0) {
      //   existingExhibits.push(exhibit);
      // }
      setProjects(symbol);
    }
    fetchData();
  }, []);
  return (
    <div>
      <p>{exhibit}</p>
    </div>
  );
};

export default ExploreProjects;
