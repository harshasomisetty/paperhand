import { PublicKey, Connection, AccountInfo } from "@solana/web3.js";
import { useState, useEffect } from "react";
// import { useWallet } from "@solana/wallet-adapter-react";
// import { Program } from "@project-serum/anchor";

// import { IDL as EXHIBITION_IDL } from "@/target/types/exhibition";
import * as ExhibitionJson from "@/target/idl/exhibition.json";

// import { getProvider } from "@/utils/provider";
import ExhibitList from "@/components/ExhibitList";
import { Project } from "@/utils/interfaces";

const connection = new Connection("http://localhost:8899", "processed");
const EXHIBITION_PROGRAM_ID = new PublicKey(
  ExhibitionJson["metadata"]["address"]
);

const ExploreExhibits = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    async function fetchData() {
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
      <h2>Explore all Exhibits</h2>
      {projects.length > 0 ? (
        <>
          <ExhibitList projects={projects} />
        </>
      ) : (
        <p>No projects created yet! </p>
      )}
    </div>
  );
};

export default ExploreExhibits;
