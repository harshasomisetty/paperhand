import { AccountInfo, PublicKey } from "@solana/web3.js";
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
  getAllBooths,
  getBoothNfts,
  getOpenBoothId,
} from "@/utils/carnival_data";
import { getCarnivalAccounts } from "@/utils/accountDerivation";

const BoothList = () => {
  const router = useRouter();
  const { wallet, publicKey, signTransaction } = useWallet();
  const { exhibitAddress } = router.query;
  const { connection } = useConnection();

  useEffect(() => {
    async function fetchData() {
      let exhibit = new PublicKey(exhibitAddress);
      let { carnival } = await getCarnivalAccounts(exhibit);

      let numBooths = await getOpenBoothId(carnival, connection, wallet);

      let boothInfos = await getAllBooths(
        connection,
        exhibit,
        numBooths,
        wallet
      );

      console.log("booth infos", boothInfos[0].data);

      for (let index of Object.keys(boothInfos)) {
        let booth = boothInfos[index].publicKey;

        // let fetchedNfts = await getBoothNfts(connection, mx, exhibit, booth);
      }

      // const mx = Metaplex.make(connection);
      // const allUserNfts = await mx.nfts().findAllByOwner(publicKey);

      // const curNfts = [];
      // for (let nft of allUserNfts!) {
      //   if (nft.symbol == exhibitInfo.exhibitSymbol) {
      //     curNfts.push(nft);
      //   }
      // }
      // setUserNftList(curNfts);
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  return (
    <div>
      <p>Booth Card</p>
      <p></p>
    </div>
  );
};

export default BoothList;
