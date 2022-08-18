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
}

export const NftContext = createContext<NftContextInterface>({
  chosenNfts: {},
  chooseNft: (pickedNft: Nft) => {},
  clearNfts: () => {},
  addNft: (pickedNft: Nft) => {},
  removeNft: (pickedNft: Nft) => {},
});

export const useNftContext = () => useContext(NftContext);

export const NftProvider = ({ children }) => {
  const [chosenNfts, setChosenNfts] = useState<Record<string, Nft>>({});

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

  // function indexedNfts(indexed: Nft[]) {
  //   let oldChosen = { ...chosenNfts };
  //   if (oldChosen[pickedNft.mint.toString()]) {
  //     delete oldChosen[pickedNft.mint.toString()];
  //   } else {
  //     oldChosen[pickedNft.mint.toString()] = pickedNft;
  //   }
  //   setChosenNfts(oldChosen);
  // }

  return (
    <NftContext.Provider
      value={{ chosenNfts, chooseNft, addNft, removeNft, clearNfts }}
    >
      {children}
    </NftContext.Provider>
  );
};
