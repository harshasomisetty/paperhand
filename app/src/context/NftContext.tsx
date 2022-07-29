import { Nft } from "@metaplex-foundation/js";
import { PublicKey } from "@solana/web3.js";

import { createContext, useContext, useMemo, useState } from "react";

interface NftContextInterface {
  selectedNft: Nft | null;
  setSelectedNftPubkey: () => void;
}
export const NftContext = createContext<NftContextInterface>({
  // nftPubkey: PublicKey | null,
  selectedNft: null,
  setSelectedNft: () => {},
});

export const useNftContext = () => useContext(NftContext);

export const NftProvider = ({ children }) => {
  const [selectedNft, setSelectedNft] = useState<Nft>();

  const value = useMemo(() => ({ selectedNft, setSelectedNft }), [selectedNft]);

  return <NftContext.Provider value={value}>{children}</NftContext.Provider>;
};

// import { Nft } from "@metaplex-foundation/js";
// import { PublicKey } from "@solana/web3.js";

// import { createContext, useContext, useMemo, useState } from "react";

// interface NftContextInterface {
//   selectedNft: Record<string, Nft> | null;
//   setSelectedNftPubkey: () => void;
// }
// export const NftContext = createContext<NftContextInterface>({
//   // nftPubkey: PublicKey | null,
//   selectedNft: null,
//   setSelectedNft: () => {},
// });

// export const useNftContext = () => useContext(NftContext);

// export const NftProvider = ({ children }) => {
//   const [selectedNft, setSelectedNft] = useState<Record<string, Nft>>();

//   const value = useMemo(() => ({ selectedNft, setSelectedNft }), [selectedNft]);

//   return <NftContext.Provider value={value}>{children}</NftContext.Provider>;
// };
