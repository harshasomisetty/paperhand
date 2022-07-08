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
  const { wallet, publicKey, signTransaction, signAllTransactions } =
    useWallet();

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

    await instructionDepositNft(
      wallet,
      publicKey,
      signTransaction,
      selectedNft,
      connection
    );
  }
  return (
    <div>
      <NftList nftList={nftList} />
      {selectedNft && (
        <>
          <p>Selected Nft Name: {selectedNft.name}</p>
          <button className="border border-black" onClick={depositNft}>
            Click to deposit nft
          </button>
        </>
      )}
    </div>
  );
}
