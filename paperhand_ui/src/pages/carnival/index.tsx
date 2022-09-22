import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { NextPage } from "next";
import { useEffect, useState } from "react";
import { EXHIBITION_PROGRAM_ID } from "@/utils/constants";
import {
  checkIfAccountExists,
  getAllExhibitArtifacts,
  getAllNftImages,
  getCarnivalAccountData,
} from "@/utils/retrieveData";
import { getCarnivalAccounts } from "@/utils/accountDerivation";
import { getAllBooths, getOpenBoothId } from "@/utils/carnival_data";

import ExistingExhibitList from "@/components/ExistingExhibitList";

const CarnivalPage: NextPage = () => {
  const { publicKey, wallet } = useWallet();
  const { connection } = useConnection();

  // const [exhibits, setExhibits] = useState<PublicKey[]>([]);
  const [exhibits, setExhibits] = useState({});

  // useEffect(() => {
  //   async function fetchData() {
  //     let allExhibitAccounts = await connection.getProgramAccounts(
  //       EXHIBITION_PROGRAM_ID
  //     );

  //     let exhibitPubkeys: PublicKey[] = [];

  //     allExhibitAccounts.forEach((exhibitAccount) =>
  //       exhibitPubkeys.push(exhibitAccount.pubkey)
  //     );

  //     setExhibits(exhibitPubkeys);
  //   }
  //   fetchData();
  // }, []);

  useEffect(() => {
    async function fetchData() {
      let allExhibitAccounts = await connection.getProgramAccounts(
        EXHIBITION_PROGRAM_ID
      );

      let exhibitsData = {};

      console.log("exhibit account?", allExhibitAccounts);

      for (let i = 0; i < allExhibitAccounts.length; i++) {
        console.log("in i", i);
        let { carnival } = await getCarnivalAccounts(
          allExhibitAccounts[i].pubkey
        );

        if (await checkIfAccountExists(carnival, connection)) {
          let fetchedData = await getCarnivalAccountData(carnival, wallet);
          let nfts = await getAllExhibitArtifacts(
            allExhibitAccounts[i].pubkey,
            connection
          );

          let numBooths = await getOpenBoothId(carnival, connection, wallet);

          let fetchedBoothInfos = await getAllBooths(
            connection,
            allExhibitAccounts[i].pubkey,
            numBooths,
            wallet
          );

          let floor = Number.MAX_VALUE;
          let ceil = Number.MIN_VALUE;
          for (let index of Object.keys(fetchedBoothInfos)) {
            let data = fetchedBoothInfos[index].data;
            let tempFloor = Number(data.spotPrice);
            let tempCeil = tempFloor + Number(data.delta);

            if (tempFloor < floor) {
              floor = tempFloor;
            }

            if (tempCeil > ceil) {
              ceil = tempCeil;
            }
          }

          let images = await getAllNftImages(nfts);
          exhibitsData[allExhibitAccounts[i].pubkey.toString()] = {
            nftListings: fetchedData.nftListings,
            images: images,
            floor: floor,
            ceil: ceil,
            symbol: fetchedData.exhibitSymbol,
          };
        }
      }

      setExhibits(exhibitsData);

      console.log("exhibits", exhibitsData);
    }
    if (wallet) {
      fetchData();
    }
  }, [wallet]);

  if (!exhibits) {
    return <p>Loading data</p>;
  } else {
    console.log("exhibits from esle", exhibits);

    return (
      <>
        <h2 className="text-2xl font-extrabold m-2">
          solana's pseudo sudoswap
        </h2>
        {publicKey ? (
          <div>
            {Object.keys(exhibits).length > 0 ? (
              /* <ExhibitList exhibits={exhibits} /> */
              <ExistingExhibitList exhibits={exhibits} base={"carnival"} />
            ) : (
              <p>No projects created yet! </p>
            )}
          </div>
        ) : (
          <p className="text-center">Please connect wallet</p>
        )}
      </>
    );
  }
};

export default CarnivalPage;
