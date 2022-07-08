import NftList from "@/components/NftList";
import { NftContext } from "@/context/NftContext";
import { instructionWithdrawNft } from "@/utils/instructions";
import {
  checkIfAccountExists,
  checkIfExhibitExists,
  getExhibitAddress,
} from "@/utils/retrieveData";
import { Nft } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useContext, useState } from "react";

interface SingleExhibitViewProps {
  nftList: Nft[] | null;
  exhibitSymbol: string;
}
export default function SingleExhibitView({
  nftList,
  exhibitSymbol,
}: SingleExhibitViewProps) {
  const { selectedNft, setSelectedNft } = useContext(NftContext);
  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();

  const router = useRouter();
  const { exhibitAddress } = router.query;
  async function withdrawNft() {
    console.log("withdrawing nft");

    await instructionWithdrawNft(
      wallet,
      publicKey,
      signTransaction,
      selectedNft,
      connection
    );
    router.reload(window.location.pathname);
  }

  return (
    <>
      {exhibitSymbol && (
        <div>
          <h2>Explore the {exhibitSymbol} Exhibit</h2>
          <h3>List of NFTs deposited in exhibit</h3>
          <NftList
            nftList={nftList}
            exhibitKey={exhibitAddress}
            extraInfo={true}
          />
          {publicKey && selectedNft && (
            <button className="border border-black p-2" onClick={withdrawNft}>
              Withdraw nft
            </button>
          )}
        </div>
      )}
    </>
  );
}
