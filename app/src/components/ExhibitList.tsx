import ExhibitCard from "@/components/ExhibitCard";

import { PublicKey } from "@solana/web3.js";

interface ExhibitListProps {
  exhibits: PublicKey[];
}
export default function ExhibitList({ exhibits }: ExhibitListProps) {
  return (
    <div className="grid grid-cols-3 justify-items-center auto-cols-max">
      {exhibits.map((exhibit, ind) => (
        <ExhibitCard exhibit={exhibit} key={ind} />
      ))}
    </div>
  );
}
