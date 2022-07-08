import NftList from "@/components/NftList";
import { NftContext } from "@/context/NftContext";
import {
  instructionDepositNft,
  instructionInitializeExhibit,
} from "@/utils/instructions";
import {
  checkIfAccountExists,
  checkIfExhibitExists,
  getExhibitAddress,
} from "@/utils/retrieveData";
import { Nft } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useContext, useState } from "react";

interface HomeViewProps {
  nftList: Nft[] | null;
}
export default function HomeView({ nftList }: HomeViewProps) {
  const { selectedNft, setSelectedNft } = useContext(NftContext);
  const [exhibitModal, setExhibitModal] = useState(false);
  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();

  async function initExhibit() {
    console.log("init exhibit");

    await selectedNft.metadataTask.run();
    await instructionInitializeExhibit(
      wallet,
      publicKey,
      signTransaction,
      selectedNft,
      connection
    );
    let exhibitExists = await checkIfExhibitExists(selectedNft, connection);
    console.log("inited? ", exhibitExists.toString());
  }

  async function depositNft() {
    console.log("depsoiting", selectedNft.name);

    await selectedNft.metadataTask.run();

    let exhibitExists = await checkIfExhibitExists(selectedNft, connection);
    if (!exhibitExists) {
      console.log("initing exhibit");
      setExhibitModal(true);
    } else {
      console.log("alread inited");
      // await instructionDepositNft();
    }
  }
  return (
    <div>
      <NftList nftList={nftList} />
      {selectedNft && (
        <>
          <p>Selected Nft Name: {selectedNft.name}</p>{" "}
          <button className="border border-black" onClick={depositNft}>
            Click to deposit nft
          </button>
          {exhibitModal && (
            <>
              <div className="flex justify-center items-center overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none">
                <div className="relative w-auto my-6 mx-auto max-w-3xl">
                  <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">
                    <div className="flex items-start justify-between p-5 border-b border-solid border-gray-300 rounded-t ">
                      <h3 className="text-3xl font=semibold">
                        Need to Init Exhibit First
                      </h3>
                    </div>
                    <div className="flex items-center justify-end p-6 border-t border-solid border-blueGray-200 rounded-b">
                      <button
                        className="text-white bg-red-500 active:bg-red-700 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1"
                        type="button"
                        onClick={() => setExhibitModal(false)}
                      >
                        Don't init exhibit :(
                      </button>
                      <button
                        className="text-white bg-yellow-500 active:bg-yellow-700 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1"
                        type="button"
                        onClick={() => {
                          initExhibit();
                          setExhibitModal(false);
                        }}
                      >
                        Initialize Exhibit!
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
