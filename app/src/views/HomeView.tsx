import NftList from "@/components/NftList";
import { NftContext } from "@/context/NftContext";
import { instructionDepositNft } from "@/utils/instructions";
import {
  checkIfAccountExists,
  checkIfExhibitExists,
  getExhibitAddress,
} from "@/utils/retrieveData";
import { Nft } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useContext, useState } from "react";

interface HomeViewProps {
  nftList: Nft[] | null;
}
export default function HomeView({ nftList }: HomeViewProps) {
  const { selectedNft, setSelectedNft } = useContext(NftContext);
  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();

  const router = useRouter();
  async function depositNft() {
    console.log("depsoiting", selectedNft.name);

    await instructionDepositNft(
      wallet,
      publicKey,
      signTransaction,
      selectedNft,
      connection
    );
    router.reload(window.location.pathname);
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
