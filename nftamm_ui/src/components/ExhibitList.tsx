import ExhibitCard from "@/components/ExhibitCard";

import { PublicKey } from "@solana/web3.js";

interface ExhibitListProps {
  exhibits: PublicKey[];
}
export default function ExhibitList({ exhibits }: ExhibitListProps) {
  return (
    <div className="flex flex-row space-x-4">
      {exhibits.map((exhibit, ind) => (
        <ExhibitCard exhibit={exhibit} key={ind} />
      ))}
    </div>
  );
}
