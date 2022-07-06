import ExhibitCard from "@/components/ExhibitCard";
import { Project } from "@/utils/interfaces";

interface ExhibitListProps {
  projects: Project[];
}
export default function ExhibitList({ projects }: ExhibitListProps) {
  return (
    <div className="grid grid-cols-3 justify-items-center auto-cols-max">
      {projects.map((project) => (
        <ExhibitCard project={project} />
      ))}
    </div>
  );
}
