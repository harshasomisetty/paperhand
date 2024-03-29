import { NftContext } from "@/context/NftContext";
import { instructionAcquireNft } from "@/utils/instructions/checkout";
import { instructionDepositNft } from "@/utils/instructions/exhibition";
import { Nft } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useContext } from "react";

const RedeemCard = ({
  leftButton,
  setLeftButton,
  userVoucher,
  userNftList,
}: {
  leftButton: boolean;
  setLeftButton: () => {};
  userVoucher: number;
  userNftList: Nft[];
}) => {
  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const router = useRouter();
  const { exhibitAddress } = router.query;

  const { chosenNfts, clearNfts } = useContext(NftContext);

  async function depositNft() {
    console.log("depositing", chosenNfts);

    await instructionDepositNft(
      wallet,
      publicKey,
      signTransaction,
      chosenNfts,
      connection
    );
    router.reload(window.location.pathname);
  }

  async function executeAcquireNft() {
    let exhibit = new PublicKey(exhibitAddress);
    if (exhibitAddress) {
      console.log("acquire nft");
      try {
        await instructionAcquireNft(
          wallet,
          publicKey,
          exhibit,
          signTransaction,
          connection,
          chosenNfts
        );
      } catch (error) {
        console.log("acquire nft buf", error);
      }
    }
    // router.reload(window.location.pathname);
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="btn-group justify-center">
        <button
          className={`btn btn-ghost ${
            leftButton && "border-success text-success"
          }`}
          onClick={() => {
            setLeftButton(true);
            clearNfts();
          }}
        >
          Redeem Voucher
        </button>
        <button
          className={`btn btn-ghost ${
            !leftButton && "border-error text-error"
          }`}
          onClick={() => {
            setLeftButton(false);
            clearNfts();
          }}
        >
          Voucherize NFT
        </button>
      </div>

      <div className="card-body items-center text-center space-y-2">
        {/* TODO add in how many nfts are being voucherized with a slider like from bidcard */}
        <div className="stat">
          <div className="stat-title">
            {leftButton ? "Vouchers" : "NFTs to Voucherize"}
          </div>
          <div className="stat-value">
            {leftButton ? userVoucher : Object.keys(chosenNfts).length}
          </div>
        </div>
        <div className="card-actions">
          {leftButton ? (
            <>
              {Object.keys(chosenNfts).length <= userVoucher &&
              userVoucher > 0 ? (
                <button className="btn btn-primary" onClick={executeAcquireNft}>
                  Redeem NFT
                </button>
              ) : (
                <button className="btn btn-disabled">Need More Vouchers</button>
              )}
            </>
          ) : (
            <>
              {Object.keys(chosenNfts).length > 0 ? (
                <button className="btn btn-primary" onClick={depositNft}>
                  Voucherize
                </button>
              ) : (
                <button className="btn btn-disabled">
                  Select a NFT to voucherize
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default RedeemCard;
