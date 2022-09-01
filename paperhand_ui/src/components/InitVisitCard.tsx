import { instructionInitCheckoutExhibit } from "@/utils/instructions/checkout";
import { checkIfAccountExists } from "@/utils/retrieveData";
import { Nft } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const InitVisitCard = ({
  nft,
  exhibitSymbol,
}: {
  nft: Nft;
  exhibitSymbol: string;
}) => {
  const [exhibitExists, setExhibitExists] = useState(false);

  const { connection } = useConnection();
  const { publicKey, wallet, signTransaction } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  async function executeInitCheckoutAndExhibit() {
    console.log("init checkout exhibit");

    console.log("creating checkout ", nft.name);
    await instructionInitCheckoutExhibit(
      wallet,
      publicKey,
      signTransaction,
      connection,
      nft
    );

    router.push("/exhibition/" + exhibitAddress);
  }

  useEffect(() => {
    async function fetchData() {
      let exhibit = new PublicKey(exhibitAddress!);
      if (await checkIfAccountExists(exhibit, connection)) {
        setExhibitExists(true);
      }
    }
    if (exhibitAddress) {
      fetchData();
    }
  }, [exhibitAddress, wallet]);

  console.log("exh symbol", exhibitSymbol);
  return (
    <div className="card w-96 bg-base-300 border border-neutral-focus shadow-lg">
      <div className="card-body items-center text-center">
        {exhibitExists ? (
          <>
            <h2 className="card-title">Visit the {exhibitSymbol} Collection</h2>
            <div className="card-actions justify-center">
              <button
                className="btn btn-primary"
                onClick={() => {
                  router.push("/exhibition/" + exhibitAddress);
                }}
              >
                Visit {exhibitSymbol}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="card-title">
              {exhibitSymbol} looks like a unseen collection
            </h2>
            <div className="card-actions justify-center">
              <p></p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  executeInitCheckoutAndExhibit();
                }}
              >
                Create {"EXHIBIT"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InitVisitCard;
