import { PublicKey } from "@solana/web3.js";
import { useState, useEffect, useContext } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  Nft,
} from "@metaplex-foundation/js";

import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { getExhibitProgramAndProvider } from "@/utils/constants";

import {
  checkIfAccountExists,
  getAllExhibitArtifacts,
  getFilledOrdersList,
  getUserData,
} from "@/utils/retrieveData";
import { NftContext, NftProvider } from "@/context/NftContext";
import { UserData } from "@/utils/interfaces";
import Orderbook from "@/components/Orderbook";
import NftList from "@/components/NftList";
import BidCard from "@/components/BidCard";
import { instructionWithdrawNft } from "@/utils/instructions/exhibition";
import {
  getCheckoutAccounts,
  getShopAccounts,
} from "@/utils/accountDerivation";

const ExplorePage = () => {
  const [exhibitSymbol, setExhibitSymbol] = useState<string>("");
  const [exhibitNftList, setExhibitNftList] = useState<Nft[]>([]);

  const [userVoucher, setUserVoucher] = useState(0);

  const { chosenNfts } = useContext(NftContext);

  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  const mx = Metaplex.make(connection);
  useEffect(() => {
    async function fetchData() {
      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);
      let exhibitExists = await checkIfAccountExists(exhibit, connection);

      let exhibitInfo;
      if (exhibitExists) {
        exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
        setExhibitSymbol(exhibitInfo.exhibitSymbol);
        let exhibitNfts = await getAllExhibitArtifacts(exhibit, connection);
        console.log("getting nfts", exhibitNfts);
        setExhibitNftList(exhibitNfts);
      }

      const allUserNfts = await mx.nfts().findAllByOwner(publicKey);

      const curNfts = [];
      for (let nft of allUserNfts!) {
        if (nft.symbol == exhibitInfo.exhibitSymbol) {
          curNfts.push(nft);
        }
      }

      let { voucherMint, matchedStorage } = await getCheckoutAccounts(exhibit);

      let userVoucherWallet = await getAssociatedTokenAddress(
        voucherMint,
        publicKey
      );

      // TODO cancel bid by id
      let uVoucher = 0;
      if (await checkIfAccountExists(userVoucherWallet, connection)) {
        uVoucher = Number(
          (await getAccount(connection, userVoucherWallet)).amount
        );
      }
      let orderFilled: Record<string, number> = await getFilledOrdersList(
        matchedStorage,
        wallet
      );

      // console.log("order filled", orderFilled);
      setUserVoucher(uVoucher + orderFilled[publicKey.toString()]);
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

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
        <NftProvider>
          <NftList nftList={exhibitNftList} title={"Exhibit NFTs"} />
          <p>{Object.keys(chosenNfts).length}</p>
          {publicKey && Object.keys(chosenNfts).length > 0 && (
            <>
              {userVoucher ? (
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
        </NftProvider>
      )}
    </>
  );
};

export default ExplorePage;
