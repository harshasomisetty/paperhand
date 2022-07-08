import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { NextPage } from "next";
import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";

import ExhibitList from "@/components/ExhibitList";
import { Project } from "@/utils/interfaces";
import * as ExhibitionJson from "@/target/idl/exhibition.json";
const EXHIBITION_PROGRAM_ID = new PublicKey(
  ExhibitionJson["metadata"]["address"]
);

const ExhibitionPage: NextPage = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();

  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    async function fetchData() {
      let allExhibitAccounts: Project[] = await connection.getProgramAccounts(
        EXHIBITION_PROGRAM_ID
      );
      setProjects(allExhibitAccounts);
    }
    fetchData();
  }, []);
  return (
    <>
      {publicKey ? (
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
      ) : (
        <p className="text-center">plis connect wallet</p>
      )}
    </>
  );
};

export default ExhibitionPage;
