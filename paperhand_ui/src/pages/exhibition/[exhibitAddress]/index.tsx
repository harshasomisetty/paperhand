import { PublicKey } from "@solana/web3.js";
import { useState, useEffect, useContext } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import router, { useRouter } from "next/router";
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
import { instructionAcquireNft } from "@/utils/instructions/checkout";
import RedeemCard from "@/components/RedeemCard";

const ExhibitPage = () => {
  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [exhibitSymbol, setExhibitSymbol] = useState<string>("");
  const [exhibitNftList, setExhibitNftList] = useState<Nft[]>([]);
  const [userVoucher, setUserVoucher] = useState(0);

  const router = useRouter();
  const { exhibitAddress } = router.query;
  console.log("exhibit add", exhibitAddress);

  useEffect(() => {
    async function fetchData() {
      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);
      let exhibitExists = await checkIfAccountExists(exhibit, connection);

      let exhibitInfo;
      if (exhibitExists) {
        exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
        let exhibitNfts = await getAllExhibitArtifacts(exhibit, connection);

        setExhibitSymbol(exhibitInfo.exhibitSymbol);
        setExhibitNftList(exhibitNfts);
      }

      let uVoucher = 0;
      let { voucherMint, matchedStorage } = await getCheckoutAccounts(exhibit);

      let userVoucherWallet = await getAssociatedTokenAddress(
        voucherMint,
        publicKey
      );

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
      console.log("u vouchers", uVoucher + orderFilled[publicKey.toString()]);
      setUserVoucher(uVoucher + orderFilled[publicKey.toString()]);
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  return (
    <>
      <NftProvider>
        <div className="flex flex-row">
          <NftList nftList={exhibitNftList} />
          <RedeemCard userVoucher={userVoucher} />
        </div>
      </NftProvider>
    </>
  );
};

export default ExhibitPage;
