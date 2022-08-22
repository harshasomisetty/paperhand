import { PublicKey } from "@solana/web3.js";
import { useState, useEffect, useContext } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import router, { useRouter } from "next/router";
import { Metaplex, Nft } from "@metaplex-foundation/js";

import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";

import { getExhibitProgramAndProvider } from "@/utils/constants";

import {
  checkIfAccountExists,
  getAllExhibitArtifacts,
  getFilledOrdersList,
} from "@/utils/retrieveData";
import { NftContext, NftProvider } from "@/context/NftContext";
import NftList from "@/components/NftList";
import { getCheckoutAccounts } from "@/utils/accountDerivation";
import RedeemCard from "@/components/RedeemCard";

const ExhibitPage = () => {
  const { wallet, publicKey } = useWallet();
  const { connection } = useConnection();

  const [exhibitSymbol, setExhibitSymbol] = useState<string>("");
  const [exhibitNftList, setExhibitNftList] = useState<Nft[]>([]);
  const [userVoucher, setUserVoucher] = useState(0);
  const [userNftList, setUserNftList] = useState<Nft[]>([]);
  const [leftButton, setLeftButton] = useState<boolean>(true);

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

      if (orderFilled[publicKey.toString()]) {
        setUserVoucher(uVoucher + orderFilled[publicKey.toString()]);
      } else {
        setUserVoucher(uVoucher);
      }

      const allUserNfts = await mx.nfts().findAllByOwner(publicKey);

      const curNfts = [];
      for (let nft of allUserNfts!) {
        if (nft.symbol == exhibitInfo.exhibitSymbol) {
          curNfts.push(nft);
        }
      }
      setUserNftList(curNfts);
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  return (
    <>
      <NftProvider>
        <div className="grid grid-cols-2 justify-items-center items-center">
          {leftButton ? (
            <NftList nftList={exhibitNftList} title={"Exhibit NFTs"} />
          ) : (
            <NftList nftList={userNftList} title={"Your NFTs"} />
          )}
          <RedeemCard
            userVoucher={userVoucher}
            leftButton={leftButton}
            setLeftButton={setLeftButton}
            userNftList={userNftList}
          />
        </div>
      </NftProvider>
    </>
  );
};

export default ExhibitPage;