import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Connection,
} from "@solana/web3.js";
import { useState, useEffect } from "react";
import ProjectList from "./ProjectList";
import EXHIBITION_IDL from "../../exhibitIdl.json";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import { EXHIBITION_PROGRAM_ID, creator } from "../../../utils/constants";

import { creatorAdd, exhibitNames } from "../utils/data";

import { Program } from "@project-serum/anchor";
import { getProvider } from "../utils/provider";
const connection = new Connection("http://localhost:8899", "processed");
const ExploreProjects = () => {
  const [projects, setProjects] = useState([]);
  const { wallet, publicKey, sendTransaction } = useWallet();
  console.log("zero wall", wallet);
  useEffect(() => {
    async function fetchData() {
      // let provider = await getProvider("http://localhost:8899", creator);
      let provider = await getProvider(wallet);
      let Exhibition = new Program(
        EXHIBITION_IDL,
        EXHIBITION_PROGRAM_ID,
        provider
      );
      let existingExhibits: PublicKey[] = [];
      for (let exhibitCurSymbol of exhibitNames) {
        let [exhibit, exhibitBump] = await PublicKey.findProgramAddress(
          [
            Buffer.from("exhibit"),
            Buffer.from(exhibitCurSymbol),
            creatorAdd.toBuffer(),
          ],
          EXHIBITION_PROGRAM_ID
        );

        let exhibitBal = await connection.getBalance(exhibit);
        if (exhibitBal > 0) {
          existingExhibits.push([exhibit, exhibitCurSymbol]);
        }
      }
      setProjects(existingExhibits);
    }
    fetchData();
  }, []);
  return (
    <div>
      <h2>Explore all Projects</h2>
      {projects.length > 0 ? (
        <ProjectList projects={projects} />
      ) : (
        <p>No projects created yet! </p>
      )}
    </div>
  );
};

export default ExploreProjects;
