import NftList from "@/components/NftList";
import { NftContext } from "@/context/NftContext";
import { instructionWithdrawNft } from "@/utils/instructions";
import { UserData } from "@/utils/interfaces";
import { Nft } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useContext } from "react";

export default function SingleExhibitView({
  nftList,
  exhibitSymbol,
  userData,
}: {
  nftList: Nft[] | null;
  exhibitSymbol: string;
  userData: UserData;
}) {
  const { selectedNft } = useContext(NftContext);
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
          <h2 className="text-2xl font-light m-2 mb-4">
            Explore the{" "}
            <span className="text-2xl font-extrabold">{exhibitSymbol}</span>{" "}
            Exhibit NFTs
          </h2>
          <NftList nftList={nftList} exhibitKey={exhibitAddress} />
          {publicKey && selectedNft && (
            <>
              {userData.voucher >= 1 ? (
                <button className="btn btn-primary" onClick={withdrawNft}>
                  Withdraw nft
                </button>
              ) : (
                <button className="btn btn-disabled">
                  Need Vouchers To Withdraw
                </button>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
