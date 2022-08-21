import { NftContext } from "@/context/NftContext";
import { instructionAcquireNft } from "@/utils/instructions/checkout";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useContext } from "react";

const RedeemCard = ({ userVoucher }: { userVoucher: number }) => {
  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const router = useRouter();
  const { exhibitAddress } = router.query;

  const { chosenNfts } = useContext(NftContext);

  async function executeAcquireNft() {
    let exhibit = new PublicKey(exhibitAddress);
    if (exhibitAddress) {
      console.log("acquire nft");
      await instructionAcquireNft(
        wallet,
        publicKey,
        exhibit,
        signTransaction,
        connection,
        chosenNfts
      );
    }
    // router.reload(window.location.pathname);
  }

  return (
    <div className="card w-96 bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Voucher</h2>
        <p>BID</p>
        <p>{userVoucher}</p>
        <div className="card-actions justify-end">
          {userVoucher ? (
            <button className="btn btn-primary" onClick={executeAcquireNft}>
              Withdraw nft
            </button>
          ) : (
            <button className="btn btn-disabled">
              Need Vouchers To Withdraw
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default RedeemCard;
