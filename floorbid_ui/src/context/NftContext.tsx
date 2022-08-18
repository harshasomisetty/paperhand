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
}

export const NftContext = createContext<NftContextInterface>({
  chosenNfts: {},
  chooseNft: (pickedNft: Nft) => {},
});

export const useNftContext = () => useContext(NftContext);

export const NftProvider = ({ children }) => {
  const [chosenNfts, setChosenNfts] = useState<Record<string, Nft>>({});

  function chooseNft(pickedNft: Nft) {
    let oldChosen = { ...chosenNfts };
    if (oldChosen[pickedNft.mint.toString()]) {
      delete oldChosen[pickedNft.mint.toString()];
    } else {
      oldChosen[pickedNft.mint.toString()] = pickedNft;
    }
    setChosenNfts(oldChosen);
  }

  return (
    <NftContext.Provider value={{ chosenNfts, chooseNft, setChosenNfts }}>
      {children}
    </NftContext.Provider>
  );
};
