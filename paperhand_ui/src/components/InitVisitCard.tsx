import { NftContext } from "@/context/NftContext";
import { instructionInitCheckoutExhibit } from "@/utils/instructions/checkout";
import { instructionDepositNft } from "@/utils/instructions/exhibition";
import { checkIfAccountExists } from "@/utils/retrieveData";
import { Nft } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";

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

  const { chosenNfts, clearNfts } = useContext(NftContext);

  async function depositNft() {
    console.log("init exhibit from depo nft", chosenNfts);

    await instructionDepositNft(
      wallet,
      publicKey,
      signTransaction,
      chosenNfts,
      connection
    );

    // router.reload(window.location.pathname);

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
                  depositNft();
                  /* router.push("/exhibition/" + exhibitAddress); */
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
                  depositNft();
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
