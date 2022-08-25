import { Nft } from "@metaplex-foundation/js";
import { PublicKey } from "@solana/web3.js";

import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";

interface NftContextInterface {
  chosenNfts: Record<string, Nft>;
  chooseNft: (pickedNft: Nft) => void;
  clearNfts: () => void;
  addNft: (pickedNft: Nft) => void;
  removeNft: (pickedNft: Nft) => void;
  nftPrices: { [mintKey: string]: string | number };
  setNftPrices: () => void;
  groupDetails: {
    [groupKey: string]: { startPrice: number; delta: number; fee: number };
  };
  setGroupDetails: () => void;
}

export const NftContext = createContext<NftContextInterface>({
  chosenNfts: {},
  chooseNft: (pickedNft: Nft) => {},
  clearNfts: () => {},
  addNft: (pickedNft: Nft) => {},
  removeNft: (pickedNft: Nft) => {},
  nftPrices: {},
  setNftPrices: () => {},
  groupDetails: {},
  setGroupDetails: () => {},
});

export const useNftContext = () => useContext(NftContext);

export const NftProvider = ({ children }) => {
  const [chosenNfts, setChosenNfts] = useState<Record<string, Nft>>({});

  // nft prices maps from nft mint to either group key, or a specific price
  const [nftPrices, setNftPrices] = useState<{
    [mintKey: string]: string | number;
  }>({});

  const [groupDetails, setGroupDetails] = useState<{
    [groupKey: string]: { startPrice: number; delta: number; fee: number };
  }>({});

  let oldChosen = { ...chosenNfts };

  function addNft(pickedNft: Nft) {
    oldChosen[pickedNft.mint.toString()] = pickedNft;
    setChosenNfts(oldChosen);
  }
  function removeNft(pickedNft: Nft) {
    delete oldChosen[pickedNft.mint.toString()];
    setChosenNfts(oldChosen);
  }
  function chooseNft(pickedNft: Nft) {
    if (oldChosen[pickedNft.mint.toString()]) {
      removeNft(pickedNft);
    } else {
      addNft(pickedNft);
    }
  }
  function clearNfts() {
    setChosenNfts({});
  }

  return (
    <NftContext.Provider
      value={{
        chosenNfts,
        chooseNft,
        addNft,
        removeNft,
        clearNfts,
        nftPrices,
        setNftPrices,
        groupDetails,
        setGroupDetails,
      }}
    >
      {children}
    </NftContext.Provider>
  );
};
