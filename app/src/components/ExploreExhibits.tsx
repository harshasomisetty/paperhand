import { PublicKey, Connection, AccountInfo } from "@solana/web3.js";
import { useState, useEffect } from "react";
// import { useWallet } from "@solana/wallet-adapter-react";
// import { Program } from "@project-serum/anchor";

// import { IDL as EXHIBITION_IDL } from "@/target/types/exhibition";
import * as ExhibitionJson from "@/target/idl/exhibition.json";

// import { getProvider } from "@/utils/provider";
import ProjectList from "@/components/ProjectList";
import { Project } from "@/utils/interfaces";

const connection = new Connection("http://localhost:8899", "processed");
const EXHIBITION_PROGRAM_ID = new PublicKey(
  ExhibitionJson["metadata"]["address"]
);

const ExploreProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  // const { wallet, publicKey, sendTransaction } = useWallet();
  useEffect(() => {
    async function fetchData() {
      // let provider = await getProvider("http://localhost:8899", creator);
      // let provider = await getProvider(wallet);
      // let Exhibition = new Program(
      //   EXHIBITION_IDL,
      //   EXHIBITION_PROGRAM_ID,
      //   provider
      // );

      let allExhibitAccounts: Project[] = await connection.getProgramAccounts(
        EXHIBITION_PROGRAM_ID
      );
      console.log("first project", allExhibitAccounts[0]?.pubkey.toString());
      setProjects(allExhibitAccounts);
      console.log(typeof allExhibitAccounts);
    }
    fetchData();
  }, []);
  return (
    <div>
      <h2>Explore all Projects</h2>
      {projects.length > 0 ? (
        <>
          <ProjectList projects={projects} />
        </>
      ) : (
        <p>No projects created yet! </p>
      )}
    </div>
  );
};

export default ExploreProjects;
