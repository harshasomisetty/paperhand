import ProjectCard from "@/components/ProjectCard";
import { Project } from "@/utils/interfaces";

interface ProjectListProps {
  projects: Project[];
}
export default function ProjectList({ projects }: ProjectListProps) {
  return (
    <div className="grid grid-cols-3 justify-items-center auto-cols-max">
      {projects.map((project) => (
        <ProjectCard project={project} />
      ))}
    </div>
  );
}
