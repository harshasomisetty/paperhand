import { checkIfAccountExists } from "@/utils/retrieveData";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const InitVisitCard = () => {
  const [exhibitExists, setExhibitExists] = useState(false);

  const { connection } = useConnection();
  const { publicKey, wallet, signTransaction } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  let exhibit = new PublicKey(exhibitAddress);

  useEffect(() => {
    async function fetchData() {
      let exhibit = new PublicKey(exhibitAddress!);
      if (await checkIfAccountExists(exhibit, connection)) {
        setExhibitExists(true);
      }
    }
  }, [exhibitAddress, wallet]);

  return (
    <div className="card w-96 bg-base-300 border border-neutral-focus shadow-lg">
      <div className="card-body items-center text-center">
        <h2 className="card-title">Exhibit </h2>
        <div className="card-actions justify-center">
          {exhibitExists ? (
            <>
              <p>Visit the {"EXHIBIT"} Collection</p>
              <button className="btn btn-primary">Visit {"EXHIBIT"}</button>
            </>
          ) : (
            <>
              <p>This looks like a unseen collection</p>
              <button className="btn btn-primary">Create {"EXHIBIT"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InitVisitCard;
